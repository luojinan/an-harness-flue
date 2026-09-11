import { useFlueAgent, type FlueConversationMessage, type FlueConversationPart } from '@flue/react';
import { type FormEvent, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';

function App() {
  const [id, setId] = useState(() => crypto.randomUUID()); const [input, setInput] = useState(''); const [error, setError] = useState<string>();
  const agent = useFlueAgent({ url: `/agents/translator/${id}` });
  const busy = ['streaming', 'submitted', 'connecting'].includes(agent.status);
  const submit = async (e: FormEvent) => { e.preventDefault(); const text = input.trim(); if (!text || busy) return; setInput(''); setError(undefined); try { await agent.sendMessage(text); } catch (x) { setInput(text); setError(x instanceof Error ? x.message : String(x)); } };
  const fresh = () => { setId(crypto.randomUUID()); setInput(''); setError(undefined); };
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><b>✦</b> Flue Chat</div><Button className="new-chat" onClick={fresh}>＋ 新建对话</Button><small>最近对话</small><button className="history-item active">翻译助手</button><div className="sidebar-foot">由 Cloudflare Workers 驱动</div></aside><main className="chat-panel"><header><div><h1>翻译助手</h1><p>随时开始一段新的对话</p></div><span className={`status ${agent.status}`}><i />{busy ? '生成中' : agent.status === 'error' ? '连接错误' : '在线'}</span></header><div className="messages" role="log" aria-live="polite">{agent.messages.length === 0 && agent.historyReady && <div className="welcome"><div>✦</div><h2>你好，我是你的翻译助手</h2><p>发送文字，我会帮你翻译成自然、准确的表达。</p><button onClick={() => setInput('请将这句话翻译成英文：今天天气真好。')}>试试中译英</button></div>}{agent.messages.map(m => <Message key={m.id} message={m} />)}{busy && <div className="typing"><i /><i /><i /></div>}</div><form className="composer" onSubmit={submit}><Textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(e); } }} placeholder="输入消息，按 Enter 发送 · Shift + Enter 换行" rows={1} /><Button className="send" disabled={!input.trim() || busy}>↑</Button></form>{(error || agent.error) && <div className="error">{error || agent.error?.message}</div>}<footer>AI 生成内容可能存在误差，请核实重要信息</footer></main></div>;
}
function Message({ message }: { message: FlueConversationMessage }) { return <article className={`message ${message.role}`}><div className="avatar">{message.role === 'user' ? '你' : '✦'}</div><div><strong>{message.role === 'user' ? '你' : '翻译助手'}</strong>{message.parts.map((p, i) => <Part key={`${i}-${key(p)}`} part={p} />)}</div></article>; }
function Part({ part }: { part: FlueConversationPart }) { if (part.type === 'text') return <p>{part.text}</p>; if (part.type === 'reasoning') return <details><summary>思考过程</summary><p>{part.text}</p></details>; if (part.type === 'file') return part.url ? <a href={part.url}>{part.filename ?? part.id ?? part.mediaType}</a> : <span>{part.filename ?? part.mediaType}</span>; if (part.type === 'dynamic-tool') return <pre>工具：{part.toolName} [{part.state}]</pre>; return <pre>{JSON.stringify(part.data, null, 2)}</pre>; }
function key(p: FlueConversationPart) { return p.type === 'dynamic-tool' ? p.toolCallId : p.type; }
const root = document.getElementById('root'); if (!root) throw new Error('Missing React root element'); createRoot(root).render(<App />);
