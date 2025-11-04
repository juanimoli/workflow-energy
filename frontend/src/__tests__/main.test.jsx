import ReactDOM from 'react-dom/client'
import { vi, describe, it, expect } from 'vitest'

// mock heavy submodules used by main.jsx so import is lightweight
vi.mock('../App.jsx', () => ({ default: () => null }))
vi.mock('../context/AuthContext.jsx', () => ({ AuthProvider: ({ children }) => <div>{children}</div> }))
vi.mock('../theme/theme.js', () => ({ default: {} }))
vi.mock('../index.css', () => ({}))
vi.mock('react-query', () => ({ QueryClient: function () {}, QueryClientProvider: ({ children }) => <div>{children}</div> }))
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material')
  return {
    ...actual,
    ThemeProvider: ({ children }) => <div>{children}</div>,
    CssBaseline: () => null,
  }
})

describe('main entry', () => {
  it('calls createRoot and render', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const renderMock = vi.fn()
    const createRootMock = vi.spyOn(ReactDOM, 'createRoot').mockReturnValue({ render: renderMock })

    // import main after mocking createRoot and heavy modules
    await import('../main.jsx')

    expect(createRootMock).toHaveBeenCalledWith(document.getElementById('root'))
    expect(renderMock).toHaveBeenCalled()

    createRootMock.mockRestore()
  })
})
