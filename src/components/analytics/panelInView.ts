import { createContext } from 'react'

// パネルが画面内に入ったかどうか。中のグラフはこれを見て、表示されたタイミングで動き始める。
// パネルの外で使われた場合は、常に表示中として扱う
export const PanelInViewContext = createContext(true)
