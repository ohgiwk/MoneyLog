import { createContext } from 'react'

// 親のまとまり（パネルなど）が画面内に入ったかどうか。中のグラフはこれを見て、表示されたタイミングで動き始める。
// 提供元がない場合は、常に表示中として扱う
export const InViewContext = createContext(true)
