import { Collapsible } from '@base-ui/react/collapsible';
import { Drawer } from '@base-ui/react/drawer';
import { useFlueAgent, type FlueConversationMessage, type FlueConversationPart } from '@flue/react';
import * as stylex from '@stylexjs/stylex';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { t } from './tokens.stylex';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';

const DESKTOP = '(min-width: 900px)';
const NEW_CHAT_TITLE = '新对话';

interface Session {
  id: string;
  title: string;
}

/** First line of a message, clipped, so the sidebar entry is recognizable. */
function toTitle(text: string) {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > 24 ? `${line.slice(0, 24)}…` : line;
}

function newSession(): Session {
  return { id: crypto.randomUUID(), title: NEW_CHAT_TITLE };
}

/**
 * Above 900px the nav is a permanent rail; below it, a modal Drawer. Those are
 * different components rather than one component restyled, so the breakpoint
 * has to be observed in JS instead of a media query.
 */
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

const blink = stylex.keyframes({
  '0%, 60%, 100%': { opacity: 0.25 },
  '30%': { opacity: 1 },
});

const rise = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(6px)' },
  to: { opacity: 1, transform: 'translateY(0)' },
});

/**
 * StyleX needs media queries as static literals, so the breakpoint below is
 * spelled out rather than interpolated from `DESKTOP`. Keep the two in sync.
 */
const shell = stylex.create({
  app: { display: 'flex', height: '100dvh', overflow: 'hidden' },
  main: {
    display: 'flex',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: 'column',
    paddingTop: {
      default: `calc(${t.headerH} + env(safe-area-inset-top, 0px))`,
      '@media (min-width: 900px)': 0,
    },
  },
  header: {
    position: 'fixed',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 30,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    height: `calc(${t.headerH} + env(safe-area-inset-top, 0px))`,
    paddingTop: 'env(safe-area-inset-top, 0px)',
    paddingInline: '6px',
    backgroundColor: 'rgba(11, 11, 13, 0.82)',
    backdropFilter: 'blur(12px)',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: t.border,
  },
  headerTitle: {
    flexGrow: 1,
    minWidth: 0,
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

const nav = stylex.create({
  /* Shared inner layout: identical whether the container is a rail or a popup. */
  inner: {
    display: 'flex',
    flexGrow: 1,
    minHeight: 0,
    flexDirection: 'column',
    gap: '8px',
    paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
    paddingInline: '12px',
    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
  },
  /* Desktop: permanent rail, in flow. */
  rail: {
    display: 'flex',
    width: '280px',
    flexShrink: 0,
    flexDirection: 'column',
    backgroundColor: t.bgElevated,
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: t.border,
  },
  /* Mobile: portaled drawer. Backdrop/popup transitions live in styles.css. */
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  viewport: { position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none' },
  popup: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    display: 'flex',
    width: '280px',
    maxWidth: '84vw',
    flexDirection: 'column',
    backgroundColor: t.bgElevated,
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: t.border,
    pointerEvents: 'auto',
  },
  content: { display: 'flex', flexGrow: 1, minHeight: 0, flexDirection: 'column' },
});

const side = stylex.create({
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingInline: '4px',
    paddingBottom: '4px',
  },
  brand: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 700 },
  title: { margin: 0, fontSize: '18px', fontWeight: 700 },
  newChat: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left' },
  list: {
    display: 'flex',
    flexGrow: 1,
    minHeight: 0,
    flexDirection: 'column',
    gap: '2px',
    marginTop: '12px',
    overflowY: 'auto',
  },
  label: {
    paddingInline: '6px',
    paddingBottom: '6px',
    color: t.textFaint,
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    paddingBlock: '11px',
    paddingInline: '12px',
    borderStyle: 'none',
    borderRadius: t.radiusSm,
    backgroundColor: { default: 'transparent', ':hover': t.bgHover },
    color: t.textMuted,
    fontSize: '15px',
    textAlign: 'left',
    cursor: 'pointer',
  },
  itemActive: { backgroundColor: t.bgHover, color: t.text },
  itemIcon: { flexShrink: 0, opacity: 0.7 },
  itemText: { minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
});

const msg = stylex.create({
  scroll: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    overscrollBehaviorY: 'contain',
    WebkitOverflowScrolling: 'touch',
    display: 'flex',
    flexDirection: 'column',
    gap: { default: '18px', '@media (min-width: 900px)': '24px' },
    paddingTop: { default: '16px', '@media (min-width: 900px)': '28px' },
    paddingInline: { default: '14px', '@media (min-width: 900px)': '24px' },
    paddingBottom: { default: '8px', '@media (min-width: 900px)': '12px' },
  },
  /* Applied per child: StyleX has no `> *`, so centering is passed down. */
  centered: { width: '100%', maxWidth: '760px', marginInline: 'auto' },
  row: {
    display: 'flex',
    animationName: rise,
    animationDuration: '0.24s',
    animationTimingFunction: 'ease',
  },
  rowUser: { justifyContent: 'flex-end' },
  content: { display: 'flex', gap: '10px', maxWidth: '100%', minWidth: 0 },
  avatar: {
    display: 'grid',
    placeItems: 'center',
    width: '28px',
    height: '28px',
    flexShrink: 0,
    marginTop: '2px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: t.border,
    borderRadius: '50%',
    backgroundColor: t.bgElevated,
    fontSize: '13px',
  },
  /* Flex column + gap replaces `.message-text + .message-text`. */
  bubble: { display: 'flex', minWidth: 0, flexDirection: 'column', gap: '8px' },
  bubbleUser: {
    maxWidth: { default: '82vw', '@media (min-width: 900px)': '560px' },
    paddingBlock: '10px',
    paddingInline: '15px',
    borderRadius: t.radiusLg,
    borderBottomRightRadius: '6px',
    backgroundColor: t.bubbleUser,
  },
  text: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
});

/** Trailing underscore: `part` is the prop name inside the `Part` component. */
const part_ = stylex.create({
  reasoning: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: t.border,
    borderRadius: t.radiusSm,
    backgroundColor: t.bgElevated,
    fontSize: '14px',
  },
  /* Overrides `Button`'s base chrome: this trigger is a full-width bar, not a
     pill. Longhands only, matching the base, so StyleX resolves by order. */
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    width: '100%',
    paddingBlock: '9px',
    paddingInline: '12px',
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: t.radiusSm,
    backgroundColor: { default: 'transparent', ':hover': t.bgHover },
    color: t.textMuted,
    textAlign: 'left',
  },
  caret: { fontSize: '11px' },
  reasoningBody: {
    paddingInline: '12px',
    paddingBottom: '11px',
    color: t.textMuted,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  file: { display: 'inline-block', color: t.text, fontSize: '14px' },
  tool: {
    paddingBlock: '8px',
    paddingInline: '11px',
    borderRadius: t.radiusSm,
    backgroundColor: t.bgElevated,
    fontSize: '13px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  toolState: { color: t.textFaint },
  json: {
    margin: 0,
    paddingBlock: '10px',
    paddingInline: '12px',
    borderRadius: t.radiusSm,
    backgroundColor: t.bgElevated,
    fontSize: '13px',
    overflowX: 'auto',
  },
});

const dots = stylex.create({
  wrap: { display: 'flex', gap: '5px', paddingBlock: '8px', paddingInline: '2px' },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: t.textFaint,
    animationName: blink,
    animationDuration: '1.2s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
  /* Dynamic style replaces `:nth-child(n)` on the dots. */
  delay: (ms: string) => ({ animationDelay: ms }),
});

const hello = stylex.create({
  wrap: {
    display: 'flex',
    flexGrow: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBlock: '32px',
    paddingInline: '8px',
    textAlign: 'center',
  },
  icon: { fontSize: '34px', lineHeight: 1 },
  title: { marginTop: '16px', marginBottom: '6px', fontSize: '24px', fontWeight: 650 },
  sub: { margin: 0, color: t.textMuted, fontSize: '15px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
    width: '100%',
    maxWidth: '440px',
    marginTop: '28px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '14px',
    backgroundColor: { default: t.bgElevated, ':hover': t.bgHover },
    borderColor: { default: t.border, ':hover': t.textFaint },
    color: { default: t.textMuted, ':hover': t.text },
    fontSize: '14px',
    textAlign: 'left',
  },
  cardIcon: { fontSize: '18px', lineHeight: 1 },
});

const bar = stylex.create({
  wrap: {
    paddingTop: { default: '6px', '@media (min-width: 900px)': '8px' },
    paddingInline: { default: '12px', '@media (min-width: 900px)': '24px' },
    paddingBottom: {
      default: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
      '@media (min-width: 900px)': '18px',
    },
    backgroundColor: t.bg,
  },
  centered: { width: '100%', maxWidth: '760px', marginInline: 'auto' },
  form: { margin: 0 },
  field: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    paddingBlock: '6px',
    paddingRight: '6px',
    paddingLeft: '8px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: t.border, ':focus-within': t.textFaint },
    borderRadius: t.radiusLg,
    backgroundColor: t.bgInput,
  },
  input: {
    flexGrow: 1,
    minWidth: 0,
    maxHeight: '40vh',
    paddingBlock: '8px',
    paddingInline: '4px',
  },
  send: {
    display: 'grid',
    placeItems: 'center',
    width: '36px',
    height: '36px',
    flexShrink: 0,
    padding: 0,
    borderStyle: 'none',
    borderRadius: '50%',
    backgroundColor: t.accent,
    color: t.accentFg,
    cursor: 'pointer',
    transitionProperty: 'opacity, transform',
    transitionDuration: '150ms',
    opacity: { default: 1, ':disabled': 0.3 },
    transform: { default: 'none', ':active:not(:disabled)': 'scale(0.92)' },
  },
  err: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    paddingBlock: '10px',
    paddingInline: '12px',
    borderRadius: t.radiusSm,
    backgroundColor: t.dangerBg,
    color: t.danger,
    fontSize: '13px',
  },
  errIcon: { flexShrink: 0 },
});

/**
 * Applied on top of `Button`'s base style, so every property it needs to undo
 * is spelled with the same longhand the base uses — StyleX resolves collisions
 * by application order, but only when the property keys actually match.
 */
const btn = stylex.create({
  icon: {
    display: 'grid',
    placeItems: 'center',
    width: '40px',
    height: '40px',
    flexShrink: 0,
    paddingBlock: 0,
    paddingInline: 0,
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: '50%',
    backgroundColor: { default: 'transparent', ':hover': t.bgHover, ':active': t.bgHover },
    color: t.text,
  },
});

const path = {
  menu: 'M3 6h18M3 12h18M3 18h18',
  plus: 'M12 5v14M5 12h14',
  close: 'M18 6 6 18M6 6l12 12',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  send: 'M12 19V5M5 12l7-7 7 7',
  warn: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01',
} as const;

function Icon({
  d,
  size = 24,
  xstyle,
}: {
  d: string;
  size?: number;
  xstyle?: stylex.StyleXStyles;
}) {
  return (
    <svg
      {...stylex.props(xstyle)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/**
 * Base UI parts take `className`/`style` directly, and `stylex.props()` returns
 * exactly that pair — but the Drawer transitions are keyed off data-attributes
 * in styles.css, so the StyleX class has to be merged with a literal one.
 */
function withClass<T extends { className?: string }>(props: T, extra: string): T {
  return { ...props, className: [props.className, extra].filter(Boolean).join(' ') };
}

/**
 * Nav content, shared verbatim by the desktop rail and the mobile Drawer.
 * `heading` and `closeSlot` are slots so the Drawer can pass `Drawer.Title`
 * (which supplies the dialog's accessible name) and `Drawer.Close`, while the
 * rail passes a plain heading and nothing.
 */
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
    <div {...stylex.props(nav.inner)}>
      <div {...stylex.props(side.head)}>{heading}{closeSlot}</div>

      <Button xstyle={side.newChat} onClick={onNew}>
        <Icon d={path.plus} size={20} />
        新建对话
      </Button>

      <div {...stylex.props(side.list)}>
        <div {...stylex.props(side.label)}>最近对话</div>
        {sessions.map(s => (
          <button
            key={s.id}
            {...stylex.props(side.item, s.id === currentId && side.itemActive)}
            onClick={() => onSelect(s.id)}
            aria-current={s.id === currentId ? 'true' : undefined}
          >
            <Icon d={path.chat} size={18} xstyle={side.itemIcon} />
            <span {...stylex.props(side.itemText)}>{s.title}</span>
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
  /** False once the user scrolls up, so streaming tokens don't yank them back down. */
  const pinned = useRef(true);

  const agent = useFlueAgent({ url: `/agents/translator/${currentId}` });
  const busy = ['streaming', 'submitted', 'connecting'].includes(agent.status);
  /**
   * Dots only cover the gap before the first token. Once text is streaming the
   * reply itself is the progress indicator, so showing both reads as a stall.
   */
  const waiting = busy && agent.messages.at(-1)?.role !== 'assistant';

  // Follow the tail of the conversation only while the user is already there.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !pinned.current) return;
    el.scrollTop = el.scrollHeight;
  }, [agent.messages]);

  // Grow the composer with its content instead of scrolling inside one row.
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
    setSessions(prev =>
      prev.map(s => (s.id === currentId && s.title === NEW_CHAT_TITLE ? { ...s, title: toTitle(text) } : s)),
    );

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
    <main {...stylex.props(shell.main)}>
      <div {...stylex.props(msg.scroll)} ref={scrollRef} onScroll={onScroll} role="log" aria-live="polite">
        {agent.messages.length === 0 && agent.historyReady && <WelcomeScreen onPick={setInput} />}

        {agent.messages.map(m => (
          <Message key={m.id} message={m} />
        ))}

        {waiting && (
          <div {...stylex.props(msg.row, msg.centered)}>
            <div {...stylex.props(msg.content)}>
              <div {...stylex.props(msg.avatar)}>✦</div>
              <div {...stylex.props(dots.wrap)}>
                {['0s', '0.18s', '0.36s'].map(d => (
                  <span key={d} {...stylex.props(dots.dot, dots.delay(d))} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div {...stylex.props(bar.wrap)}>
        {(error || agent.error) && (
          <div {...stylex.props(bar.err, bar.centered)} role="alert">
            <Icon d={path.warn} size={16} xstyle={bar.errIcon} />
            {error || agent.error?.message}
          </div>
        )}

        <form {...stylex.props(bar.form, bar.centered)} onSubmit={submit}>
          <div {...stylex.props(bar.field)}>
            <Textarea
              ref={inputRef}
              xstyle={bar.input}
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
            <button type="submit" {...stylex.props(bar.send)} disabled={!input.trim() || busy} aria-label="发送">
              <Icon d={path.send} size={20} />
            </button>
          </div>
        </form>
      </div>
    </main>
  );

  const brandMark = (
    <>
      <span aria-hidden="true">✦</span> Flue
    </>
  );

  // Desktop: permanent rail, no Drawer mounted at all — so no portal, no focus
  // trap, and no swipe handlers on a viewport that can't be swiped.
  if (isDesktop) {
    return (
      <div {...stylex.props(shell.app)}>
        <aside {...stylex.props(nav.rail)}>
          <SidebarNav
            sessions={sessions}
            currentId={currentId}
            onSelect={onSelect}
            onNew={onNew}
            heading={<h2 {...stylex.props(side.brand, side.title)}>{brandMark}</h2>}
          />
        </aside>
        {chatMain}
      </div>
    );
  }

  return (
    <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen} swipeDirection="left">
      <div {...stylex.props(shell.app)}>
        <header {...stylex.props(shell.header)}>
          <Drawer.Trigger render={<Button xstyle={btn.icon} />} aria-label="打开菜单">
            <Icon d={path.menu} />
          </Drawer.Trigger>
          <h1 {...stylex.props(shell.headerTitle)}>{current?.title ?? 'Flue'}</h1>
          <Button xstyle={btn.icon} onClick={onNew} aria-label="新建对话">
            <Icon d={path.plus} />
          </Button>
        </header>

        <Drawer.Portal>
          <Drawer.Backdrop {...withClass(stylex.props(nav.backdrop), 'drawer-backdrop')} />
          <Drawer.Viewport {...stylex.props(nav.viewport)}>
            <Drawer.Popup {...withClass(stylex.props(nav.popup), 'drawer-popup')}>
              <Drawer.Content {...stylex.props(nav.content)}>
                <SidebarNav
                  sessions={sessions}
                  currentId={currentId}
                  onSelect={onSelect}
                  onNew={onNew}
                  heading={<Drawer.Title {...stylex.props(side.brand, side.title)}>{brandMark}</Drawer.Title>}
                  closeSlot={
                    <Drawer.Close render={<Button xstyle={btn.icon} />} aria-label="关闭菜单">
                      <Icon d={path.close} />
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
  );
}

const SUGGESTIONS = [
  { icon: '📝', label: '制定学习计划', prompt: '帮我制定一个学习计划' },
  { icon: '💡', label: '解释一个概念', prompt: '解释一下量子计算' },
  { icon: '✉️', label: '帮我写作', prompt: '帮我写一封邮件' },
  { icon: '💻', label: '编程问题', prompt: '帮我写一个 React 组件' },
] as const;

function WelcomeScreen({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div {...stylex.props(hello.wrap, msg.centered)}>
      <div {...stylex.props(hello.icon)} aria-hidden="true">
        ✦
      </div>
      <h2 {...stylex.props(hello.title)}>你好，我是 Flue</h2>
      <p {...stylex.props(hello.sub)}>我可以帮你写作、分析、编程和回答问题</p>

      <div {...stylex.props(hello.grid)}>
        {SUGGESTIONS.map(s => (
          <Button key={s.label} xstyle={hello.card} onClick={() => onPick(s.prompt)}>
            <span {...stylex.props(hello.cardIcon)} aria-hidden="true">
              {s.icon}
            </span>
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
    <div {...stylex.props(msg.row, isUser && msg.rowUser, msg.centered)}>
      <div {...stylex.props(msg.content)}>
        {!isUser && (
          <div {...stylex.props(msg.avatar)} aria-hidden="true">
            ✦
          </div>
        )}
        <div {...stylex.props(msg.bubble, isUser && msg.bubbleUser)}>
          {message.parts.map((p, i) => (
            <Part key={`${i}-${getPartKey(p)}`} part={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Part({ part }: { part: FlueConversationPart }) {
  if (part.type === 'text') {
    return <div {...stylex.props(msg.text)}>{part.text}</div>;
  }

  if (part.type === 'reasoning') {
    /**
     * Collapsible rather than `<details>`: it keeps the ARIA wiring but adds a
     * height transition, which `<details>` can't animate. The caret reads
     * `state.open` from the trigger's render callback, so no local state.
     * The panel's own transition is data-attribute driven — see styles.css.
     */
    return (
      <Collapsible.Root {...stylex.props(part_.reasoning)}>
        <Collapsible.Trigger
          render={(props, state) => (
            <Button {...props} xstyle={part_.summary}>
              <span {...stylex.props(part_.caret)} aria-hidden="true">
                {state.open ? '▾' : '▸'}
              </span>
              思考过程
            </Button>
          )}
        />
        <Collapsible.Panel className="reasoning-panel">
          <div {...stylex.props(part_.reasoningBody)}>{part.text}</div>
        </Collapsible.Panel>
      </Collapsible.Root>
    );
  }

  if (part.type === 'file') {
    const name = part.filename ?? part.id ?? part.mediaType;
    return part.url ? (
      <a {...stylex.props(part_.file)} href={part.url}>
        📎 {name}
      </a>
    ) : (
      <span {...stylex.props(part_.file)}>📎 {part.filename ?? part.mediaType}</span>
    );
  }

  if (part.type === 'dynamic-tool') {
    return (
      <div {...stylex.props(part_.tool)}>
        🔧 {part.toolName} <span {...stylex.props(part_.toolState)}>[{part.state}]</span>
      </div>
    );
  }

  return <pre {...stylex.props(part_.json)}>{JSON.stringify(part.data, null, 2)}</pre>;
}

function getPartKey(p: FlueConversationPart): string {
  return p.type === 'dynamic-tool' ? p.toolCallId : p.type;
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing React root element');
createRoot(root).render(<App />);
