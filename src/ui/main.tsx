import { Drawer } from '@base-ui/react/drawer';
import { useFlueAgent, type FlueConversationMessage, type FlueConversationPart } from '@flue/react';
import { cn } from 'cn';
import {
  AlertCircleIcon,
  ArrowUpIcon,
  CircleCheckIcon,
  FileTextIcon,
  MenuIcon,
  MessageSquareIcon,
  PaperclipIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  WrenchIcon,
  XIcon,
} from 'lucide-react';
import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { isAllowedChatImageType, MAX_CHAT_IMAGE_SIZE_BYTES, type ChatImageAttachment } from '@/lib/chat-image';
import { AiElementsPreview } from './ai-elements-preview';
import { AgentMessageRow } from './components/ai-elements/agent-message';
import { Reasoning } from './components/ai-elements/reasoning';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from './components/ui/attachment';
import { Button } from './components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from './components/ui/empty';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from './components/ui/input-group';
import { Marker, MarkerContent, MarkerIcon } from './components/ui/marker';
import { Message, MessageContent } from './components/ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from './components/ui/message-scroller';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import { Trace } from './components/ui/trace';
import { fileToBase64, requestSignedObjectUrl, requestUploadPolicy, uploadFileToOSS } from './lib/oss-upload';
import './styles.css';

const DESKTOP = '(min-width: 900px)';
const NEW_CHAT_TITLE = '新对话';

interface Session {
  id: string;
  title: string;
}

function toTitle(text: string) {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > 24 ? `${line.slice(0, 24)}…` : line;
}

function newSession(): Session {
  return { id: crypto.randomUUID(), title: NEW_CHAT_TITLE };
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(DESKTOP).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

/** Base UI parts accept a `render` prop; this keeps `className` merging simple. */
function withClass<T extends { className?: string }>(props: T, extra: string): T {
  return { ...props, className: [props.className, extra].filter(Boolean).join(' ') };
}

function SidebarNav({
  sessions,
  currentId,
  onSelect,
  onNew,
  heading,
  closeSlot,
}: {
  sessions: Session[];
  currentId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  heading: ReactNode;
  closeSlot?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
      <div className="flex items-center justify-between px-1 pb-1">
        {heading}
        {closeSlot}
      </div>

      <Button
        variant="secondary"
        className="flex h-10 w-full items-center justify-start gap-2.5 text-left"
        onClick={onNew}
      >
        <PlusIcon />
        新建对话
      </Button>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        <div className="px-1.5 pb-1.5 text-xs font-semibold tracking-[0.04em] text-muted-foreground/70 uppercase">
          最近对话
        </div>
        {sessions.map(s => (
          <Button
            key={s.id}
            variant="ghost"
            aria-current={s.id === currentId ? 'page' : undefined}
            className={cn(
              'flex h-10 w-full items-center justify-start gap-2.5 text-[15px] font-normal text-muted-foreground',
              s.id === currentId && 'bg-muted text-foreground',
            )}
            onClick={() => onSelect(s.id)}
          >
            <MessageSquareIcon className="shrink-0 opacity-70" />
            <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{s.title}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function App() {
  const isDesktop = useIsDesktop();
  const [sessions, setSessions] = useState<Session[]>(() => [newSession()]);
  const [currentId, setCurrentId] = useState(() => sessions[0].id);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track IME composition so Enter that confirms a candidate (e.g. pinyin)
  // never submits the message.
  const composingRef = useRef(false);
  const [attachments, setAttachments] = useState<ChatImageAttachment[]>([]);

  const agent = useFlueAgent({ url: `/agents/translator/${currentId}` });
  const busy = ['streaming', 'submitted', 'connecting'].includes(agent.status);
  const lastMessage = agent.messages.at(-1);
  // The assistant message is created before its parts stream in, so "not the last
  // message" is not the right test — that window made the thinking line vanish.
  // Keep it up until the reply actually has a part to render.
  const waiting = busy && !(lastMessage?.role === 'assistant' && lastMessage.parts.length > 0);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  const updateAttachment = (id: string, patch: Partial<ChatImageAttachment>) => {
    setAttachments(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)));
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const target = prev.find(a => a.id === id);
      if (target?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const onFilesSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(undefined);

    for (const file of files) {
      const id = crypto.randomUUID();
      const attachment: ChatImageAttachment = {
        id,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        status: 'uploading',
        previewUrl: URL.createObjectURL(file),
      };
      setAttachments(prev => [...prev, attachment]);

      try {
        if (!isAllowedChatImageType(file.type)) {
          throw new Error('仅支持 JPG、PNG、WEBP、GIF 图片');
        }
        if (file.size > MAX_CHAT_IMAGE_SIZE_BYTES) {
          throw new Error('图片不能超过 10MB');
        }

        const [base64, policy] = await Promise.all([
          fileToBase64(file),
          requestUploadPolicy({
            conversationId: currentId,
            fileName: file.name,
            contentType: file.type,
            size: file.size,
          }),
        ]);

        await uploadFileToOSS(file, policy);

        let llmImageUrl: string | undefined;
        try {
          const signed = await requestSignedObjectUrl(policy.bucket, policy.region, policy.objectKey);
          llmImageUrl = signed.url;
        } catch {
          // 签名预览 URL 失败不阻塞发送
        }

        updateAttachment(id, {
          status: 'ready',
          base64,
          bucket: policy.bucket,
          region: policy.region,
          objectKey: policy.objectKey,
          llmImageUrl,
        });
      } catch (err) {
        updateAttachment(id, {
          status: 'upload-error',
          error: err instanceof Error ? err.message : '上传失败',
        });
      }
    }

    e.target.value = '';
  };

  const readyImages = attachments
    .filter((a): a is ChatImageAttachment & { base64: string } => a.status === 'ready' && Boolean(a.base64))
    .map(a => ({
      type: 'image' as const,
      data: a.base64,
      mimeType: a.mimeType,
      filename: a.fileName,
    }));
  const hasPendingUpload = attachments.some(a => a.status === 'uploading');
  const canSend = !busy && !hasPendingUpload && (input.trim().length > 0 || readyImages.length > 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!canSend) return;

    setInput('');
    setError(undefined);
    setSessions(prev =>
      prev.map(s => (s.id === currentId && s.title === NEW_CHAT_TITLE ? { ...s, title: toTitle(text) } : s)),
    );

    try {
      await agent.sendMessage(text, { images: readyImages });
      setAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setInput(text);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const onNew = () => {
    const next = newSession();
    setSessions(prev => [next, ...prev]);
    setCurrentId(next.id);
    setInput('');
    setError(undefined);
    setDrawerOpen(false);
  };

  const onSelect = (id: string) => {
    setCurrentId(id);
    setError(undefined);
    setDrawerOpen(false);
  };

  const current = sessions.find(s => s.id === currentId);

  const chatMain = (
    <main className="flex min-w-0 flex-1 flex-col pt-[calc(52px+env(safe-area-inset-top,0px))] min-[900px]:pt-0">
      <div className="flex min-h-0 flex-1 flex-col px-3 pt-4 min-[900px]:px-6 min-[900px]:pt-7">
        {agent.messages.length === 0 && agent.historyReady ? (
          <WelcomeScreen onPick={setInput} />
        ) : (
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent className="mx-auto w-full max-w-[760px] gap-[18px] pb-2 min-[900px]:gap-6 min-[900px]:pb-3">
                {agent.messages.map(message => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === 'user'}
                  >
                    <AgentMessageRow message={message} streaming={busy && message === lastMessage} />
                  </MessageScrollerItem>
                ))}

                {waiting && (
                  <MessageScrollerItem messageId="__pending__">
                    <Message>
                      <MessageContent>
                        <Trace>
                          <Reasoning text="" running />
                        </Trace>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        )}
      </div>

      <div className="bg-background px-3 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] min-[900px]:px-6 min-[900px]:pt-2 min-[900px]:pb-[18px]">
        {(error || agent.error) && (
          <Marker
            className="mx-auto mb-2 w-full max-w-[760px] rounded-lg bg-destructive/10 px-3 py-2 text-destructive"
            role="alert"
          >
            <MarkerIcon>
              <AlertCircleIcon />
            </MarkerIcon>
            <MarkerContent>{error || agent.error?.message}</MarkerContent>
          </Marker>
        )}

        <form className="mx-auto w-full max-w-[760px]" onSubmit={submit}>
          {attachments.length > 0 && (
            <AttachmentGroup className="mb-2">
              {attachments.map(a => (
                <Attachment
                  key={a.id}
                  state={a.status === 'uploading' ? 'uploading' : a.status === 'upload-error' ? 'error' : 'done'}
                >
                  <AttachmentMedia variant={a.previewUrl ? 'image' : 'icon'}>
                    {a.previewUrl ? <img src={a.previewUrl} alt={a.fileName} /> : <PaperclipIcon />}
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{a.fileName}</AttachmentTitle>
                    <AttachmentDescription>
                      {a.status === 'uploading' ? '上传中…' : a.status === 'upload-error' ? (a.error ?? '上传失败') : '已就绪'}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction onClick={() => removeAttachment(a.id)} aria-label="移除图片">
                      <XIcon />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ))}
            </AttachmentGroup>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={onFilesSelected}
          />

          <InputGroup>
            <InputGroupTextarea
              ref={inputRef}
              className="max-h-[40vh] min-h-9 px-3.5 py-2"
              value={input}
              onChange={e => setInput(e.target.value)}
              onCompositionStart={() => {
                composingRef.current = true;
              }}
              onCompositionEnd={() => {
                composingRef.current = false;
              }}
              onKeyDown={e => {
                // `isComposing` covers most browsers; Safari reports keyCode 229
                // for the Enter that ends a composition; the ref covers the rest.
                if (composingRef.current || e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) {
                  return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submit(e);
                }
              }}
              placeholder="输入消息..."
              rows={1}
            />
            <InputGroupAddon align="block-end" className="gap-1.5">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <InputGroupButton
                      size="icon-sm"
                      variant="ghost"
                      disabled={busy}
                      aria-label="上传图片"
                    >
                      <PaperclipIcon />
                    </InputGroupButton>
                  }
                  onClick={() => fileInputRef.current?.click()}
                />
                <TooltipContent>上传图片</TooltipContent>
              </Tooltip>

              <InputGroupButton
                type="submit"
                size="icon-sm"
                variant="default"
                className="ml-auto"
                disabled={!canSend}
                aria-label="发送"
              >
                <ArrowUpIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
      </div>
    </main>
  );

  const brandMark = (
    <>
      <SparklesIcon className="size-[18px]" aria-hidden="true" /> <span>Flue</span>
    </>
  );

  if (isDesktop) {
    return (
      <TooltipProvider>
        <MessageScrollerProvider autoScroll>
          <div className="flex h-dvh overflow-hidden bg-background text-foreground">
            <aside className="flex w-[280px] shrink-0 flex-col border-r border-border bg-card">
              <SidebarNav
                sessions={sessions}
                currentId={currentId}
                onSelect={onSelect}
                onNew={onNew}
                heading={<h2 className="flex items-center gap-2 text-lg font-bold">{brandMark}</h2>}
              />
            </aside>
            {chatMain}
          </div>
        </MessageScrollerProvider>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <MessageScrollerProvider autoScroll>
        <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen} swipeDirection="left">
          <div className="flex h-dvh overflow-hidden bg-background text-foreground">
            <header className="fixed inset-x-0 top-0 z-30 flex h-[calc(52px+env(safe-area-inset-top,0px))] items-center gap-1 border-b border-border bg-background/85 px-1 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
              <Drawer.Trigger render={<Button variant="ghost" size="icon" />} aria-label="打开菜单">
                <MenuIcon />
              </Drawer.Trigger>
              <h1 className="m-0 min-w-0 flex-1 overflow-hidden text-center text-base font-semibold text-ellipsis whitespace-nowrap">
                {current?.title ?? 'Flue'}
              </h1>
              <Button variant="ghost" size="icon" onClick={onNew} aria-label="新建对话">
                <PlusIcon />
              </Button>
            </header>

            <Drawer.Portal>
              <Drawer.Backdrop {...withClass({ className: 'fixed inset-0 z-40 bg-black/55' }, 'drawer-backdrop')} />
              <Drawer.Viewport className="pointer-events-none fixed inset-0 z-50">
                <Drawer.Popup
                  {...withClass(
                    {
                      className:
                        'pointer-events-auto absolute inset-y-0 left-0 flex w-[280px] max-w-[84vw] flex-col border-r border-border bg-card',
                    },
                    'drawer-popup',
                  )}
                >
                  <Drawer.Content className="flex min-h-0 flex-1 flex-col">
                    <SidebarNav
                      sessions={sessions}
                      currentId={currentId}
                      onSelect={onSelect}
                      onNew={onNew}
                      heading={<Drawer.Title className="flex items-center gap-2 text-lg font-bold">{brandMark}</Drawer.Title>}
                      closeSlot={
                        <Drawer.Close render={<Button variant="ghost" size="icon" />} aria-label="关闭菜单">
                          <XIcon />
                        </Drawer.Close>
                      }
                    />
                  </Drawer.Content>
                </Drawer.Popup>
              </Drawer.Viewport>
            </Drawer.Portal>

            {chatMain}
          </div>
        </Drawer.Root>
      </MessageScrollerProvider>
    </TooltipProvider>
  );
}

const SUGGESTIONS = [
  { icon: FileTextIcon, label: '制定学习计划', prompt: '帮我制定一个学习计划' },
  { icon: SparklesIcon, label: '解释一个概念', prompt: '解释一下量子计算' },
  { icon: SendIcon, label: '帮我写作', prompt: '帮我写一封邮件' },
  { icon: WrenchIcon, label: '编程问题', prompt: '帮我写一个 React 组件' },
] as const;

function WelcomeScreen({ onPick }: { onPick: (text: string) => void }) {
  return (
    <Empty className="flex-1 border-0 p-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SparklesIcon />
        </EmptyMedia>
        <EmptyTitle>你好，我是 Flue</EmptyTitle>
        <EmptyDescription>我可以帮你写作、分析、编程和回答问题</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="max-w-[440px]">
        <div className="grid w-full grid-cols-2 gap-2.5">
          {SUGGESTIONS.map(s => (
            <Button
              key={s.label}
              variant="outline"
              className="h-auto flex-col items-start gap-2 px-3.5 py-3.5 text-left text-sm font-normal text-muted-foreground"
              onClick={() => onPick(s.prompt)}
            >
              <s.icon />
              {s.label}
            </Button>
          ))}
        </div>
      </EmptyContent>
    </Empty>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing React root element');

// `/?preview` renders a deterministic transcript of every AI Elements pattern.
const preview = new URLSearchParams(window.location.search).has('preview');
createRoot(root).render(preview ? <AiElementsPreview /> : <App />);
