import { Collapsible } from '@base-ui/react/collapsible';
import { Drawer } from '@base-ui/react/drawer';
import { useFlueAgent, type FlueConversationMessage, type FlueConversationPart } from '@flue/react';
import {
  AlertCircle,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  FileText,
  Menu,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { cn } from './lib/utils';
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

type IconComponent = typeof Sparkles;

function Icon({ icon: IconComponent, size = 24, className }: { icon: IconComponent; size?: number; className?: string }) {
  return <IconComponent size={size} strokeWidth={2} aria-hidden="true" className={className} />;
}

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
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-[calc(env(safe-area-inset-top,0px)+12px)]">
      <div className="flex items-center justify-between px-1 pb-1">{heading}{closeSlot}</div>

      <Button className="flex w-full items-center justify-start gap-2.5 text-left" onClick={onNew}>
        <Icon icon={Plus} size={20} />
        新建对话
      </Button>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        <div className="px-1.5 pb-1.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">最近对话</div>
        {sessions.map(s => (
          <button
            key={s.id}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm-value)] border-0 bg-transparent px-3 py-2.5 text-left text-[15px] text-muted-foreground transition-colors hover:bg-hover',
              s.id === currentId && 'bg-hover text-foreground',
            )}
            onClick={() => onSelect(s.id)}
            aria-current={s.id === currentId ? 'true' : undefined}
          >
            <Icon icon={MessageSquare} size={18} className="shrink-0 opacity-70" />
            <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{s.title}</span>
          </button>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pinned = useRef(true);

  const agent = useFlueAgent({ url: `/agents/translator/${currentId}` });
  const busy = ['streaming', 'submitted', 'connecting'].includes(agent.status);
  const waiting = busy && agent.messages.at(-1)?.role !== 'assistant';

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !pinned.current) return;
    el.scrollTop = el.scrollHeight;
  }, [agent.messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    setInput('');
    setError(undefined);
    pinned.current = true;
    setSessions(prev => prev.map(s => (s.id === currentId && s.title === NEW_CHAT_TITLE ? { ...s, title: toTitle(text) } : s)));

    try {
      await agent.sendMessage(text);
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
    pinned.current = true;
  };

  const onSelect = (id: string) => {
    setCurrentId(id);
    setError(undefined);
    setDrawerOpen(false);
    pinned.current = true;
  };

  const current = sessions.find(s => s.id === currentId);

  const chatMain = (
    <main className="flex min-w-0 flex-1 flex-col pt-[calc(52px+env(safe-area-inset-top,0px))] min-[900px]:pt-0">
      <div
        className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto overscroll-y-contain px-3.5 pb-2 pt-4 [webkit-overflow-scrolling:touch] min-[900px]:gap-6 min-[900px]:px-6 min-[900px]:pb-3 min-[900px]:pt-7"
        ref={scrollRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
      >
        {agent.messages.length === 0 && agent.historyReady && <WelcomeScreen onPick={setInput} />}
        {agent.messages.map(m => <Message key={m.id} message={m} />)}

        {waiting && (
          <div className="mx-auto flex w-full max-w-[760px] animate-[rise_0.24s_ease]">
            <div className="flex max-w-full min-w-0 gap-2.5">
              <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-border bg-card text-[13px]">✦</div>
              <div className="flex gap-1.5 px-0.5 py-2">
                {['0s', '0.18s', '0.36s'].map(delay => <span key={delay} className="size-1.5 animate-[blink_1.2s_ease-in-out_infinite] rounded-full bg-muted-foreground/70" style={{ animationDelay: delay }} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-background px-3 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] min-[900px]:px-6 min-[900px]:pb-[18px] min-[900px]:pt-2">
        {(error || agent.error) && (
          <div className="mx-auto mb-2 flex w-full max-w-[760px] items-center gap-2 rounded-[var(--radius-sm-value)] bg-destructive-background px-3 py-2.5 text-[13px] text-destructive" role="alert">
            <Icon icon={AlertCircle} size={16} className="shrink-0" />
            {error || agent.error?.message}
          </div>
        )}

        <form className="mx-auto w-full max-w-[760px]" onSubmit={submit}>
          <div className="flex items-end gap-2 rounded-[var(--radius-lg-value)] border border-border bg-input py-1.5 pl-2 pr-1.5 transition-colors focus-within:border-muted-foreground">
            <Textarea
              ref={inputRef}
              className="max-h-[40vh]"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submit(e);
                }
              }}
              placeholder="输入消息..."
              rows={1}
            />
            <button
              className="grid size-9 shrink-0 place-items-center rounded-full border-0 bg-accent text-accent-foreground transition-[opacity,transform] duration-150 active:scale-[0.92] disabled:opacity-30"
              type="submit"
              disabled={!input.trim() || busy}
              aria-label="发送"
            >
              <Icon icon={ArrowUp} size={20} />
            </button>
          </div>
        </form>
      </div>
    </main>
  );

  const brandMark = <><Sparkles size={18} aria-hidden="true" /> <span>Flue</span></>;

  if (isDesktop) {
    return (
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-border bg-card">
          <SidebarNav sessions={sessions} currentId={currentId} onSelect={onSelect} onNew={onNew} heading={<h2 className="flex items-center gap-2 text-lg font-bold">{brandMark}</h2>} />
        </aside>
        {chatMain}
      </div>
    );
  }

  return (
    <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen} swipeDirection="left">
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        <header className="fixed inset-x-0 top-0 z-30 flex h-[calc(52px+env(safe-area-inset-top,0px))] items-center gap-1 border-b border-border bg-background/85 px-1 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
          <Drawer.Trigger render={<Button variant="ghost" size="icon" />} aria-label="打开菜单"><Icon icon={Menu} /></Drawer.Trigger>
          <h1 className="m-0 min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-center text-base font-semibold">{current?.title ?? 'Flue'}</h1>
          <Button variant="ghost" size="icon" onClick={onNew} aria-label="新建对话"><Icon icon={Plus} /></Button>
        </header>

        <Drawer.Portal>
          <Drawer.Backdrop {...withClass({ className: 'fixed inset-0 z-40 bg-black/55' }, 'drawer-backdrop')} />
          <Drawer.Viewport className="pointer-events-none fixed inset-0 z-50">
            <Drawer.Popup {...withClass({ className: 'pointer-events-auto absolute inset-y-0 left-0 flex w-[280px] max-w-[84vw] flex-col border-r border-border bg-card' }, 'drawer-popup')}>
              <Drawer.Content className="flex min-h-0 flex-1 flex-col">
                <SidebarNav
                  sessions={sessions}
                  currentId={currentId}
                  onSelect={onSelect}
                  onNew={onNew}
                  heading={<Drawer.Title className="flex items-center gap-2 text-lg font-bold">{brandMark}</Drawer.Title>}
                  closeSlot={<Drawer.Close render={<Button variant="ghost" size="icon" />} aria-label="关闭菜单"><Icon icon={X} /></Drawer.Close>}
                />
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>

        {chatMain}
      </div>
    </Drawer.Root>
  );
}

const SUGGESTIONS = [
  { icon: FileText, label: '制定学习计划', prompt: '帮我制定一个学习计划' },
  { icon: Sparkles, label: '解释一个概念', prompt: '解释一下量子计算' },
  { icon: Send, label: '帮我写作', prompt: '帮我写一封邮件' },
  { icon: Wrench, label: '编程问题', prompt: '帮我写一个 React 组件' },
] as const;

function WelcomeScreen({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center justify-center px-2 py-8 text-center">
      <Sparkles size={34} strokeWidth={1.8} aria-hidden="true" />
      <h2 className="mb-1.5 mt-4 text-2xl font-semibold">你好，我是 Flue</h2>
      <p className="m-0 text-[15px] text-muted-foreground">我可以帮你写作、分析、编程和回答问题</p>
      <div className="mt-7 grid w-full max-w-[440px] grid-cols-2 gap-2.5">
        {SUGGESTIONS.map(s => (
          <Button key={s.label} variant="ghost" className="flex h-auto flex-col items-start gap-2 rounded-md border border-border px-3.5 py-3.5 text-left text-sm text-muted-foreground hover:border-muted-foreground hover:text-foreground" onClick={() => onPick(s.prompt)}>
            <s.icon size={18} aria-hidden="true" />
            {s.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Message({ message }: { message: FlueConversationMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('mx-auto flex w-full max-w-[760px] animate-[rise_0.24s_ease]', isUser && 'justify-end')}>
      <div className="flex max-w-full min-w-0 gap-2.5">
        {!isUser && <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-border bg-card text-[13px]" aria-hidden="true">✦</div>}
        <div className={cn('flex min-w-0 flex-col gap-2', isUser && 'max-w-[82vw] rounded-[var(--radius-lg-value)] rounded-br-[6px] bg-[#2b2b33] px-[15px] py-2.5 min-[900px]:max-w-[560px]')}>
          {message.parts.map((p, i) => <Part key={`${i}-${getPartKey(p)}`} part={p} />)}
        </div>
      </div>
    </div>
  );
}

function Part({ part }: { part: FlueConversationPart }) {
  if (part.type === 'text') return <div className="whitespace-pre-wrap break-words">{part.text}</div>;

  if (part.type === 'reasoning') {
    return (
      <Collapsible.Root className="rounded-[var(--radius-sm-value)] border border-border bg-card text-sm">
        <Collapsible.Trigger
          render={(props, state) => (
            <Button {...props} variant="ghost" className="flex w-full justify-start rounded-[var(--radius-sm-value)] border-0 px-3 py-2 text-left text-muted-foreground">
              {state.open ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
              思考过程
            </Button>
          )}
        />
        <Collapsible.Panel className="reasoning-panel">
          <div className="whitespace-pre-wrap break-words px-3 pb-2.5 text-muted-foreground">{part.text}</div>
        </Collapsible.Panel>
      </Collapsible.Root>
    );
  }

  if (part.type === 'file') {
    const name = part.filename ?? part.id ?? part.mediaType;
    return part.url ? <a className="inline-flex items-center gap-1 text-sm text-foreground underline-offset-2 hover:underline" href={part.url}><Paperclip size={14} />{name}</a> : <span className="inline-flex items-center gap-1 text-sm text-foreground"><Paperclip size={14} />{part.filename ?? part.mediaType}</span>;
  }

  if (part.type === 'dynamic-tool') return <div className="rounded-[var(--radius-sm-value)] bg-card px-2.5 py-2 font-mono text-[13px]"> <Wrench size={14} className="mr-1 inline" />{part.toolName} <span className="text-muted-foreground/70">[{part.state}]</span></div>;

  return <pre className="m-0 overflow-x-auto rounded-[var(--radius-sm-value)] bg-card px-3 py-2.5 text-[13px]">{JSON.stringify(part.data, null, 2)}</pre>;
}

function getPartKey(p: FlueConversationPart): string {
  return p.type === 'dynamic-tool' ? p.toolCallId : p.type;
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing React root element');
createRoot(root).render(<App />);
