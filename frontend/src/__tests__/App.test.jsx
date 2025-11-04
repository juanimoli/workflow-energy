import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, afterEach } from 'vitest'

// mock useAuth so we can exercise different branches in App
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// mock Layout to avoid heavy layout rendering in App tests
vi.mock('../components/Layout/Layout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}))

import App from '../App'
import { useAuth } from '../context/AuthContext'

describe('App', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders loading spinner when loading', () => {
    useAuth.mockReturnValue({ user: null, loading: true })
    render(<App />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders landing when unauthenticated', () => {
    useAuth.mockReturnValue({ user: null, loading: false })
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    )
    // Landing contains multiple elements with the same text (h1 and h6).
    expect(screen.getAllByText('WorkFlow Energy')[0]).toBeInTheDocument()
  })

  it('renders layout routes when authenticated', () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'employee' }, loading: false })
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByTestId('layout')).toBeInTheDocument()
  })
})
