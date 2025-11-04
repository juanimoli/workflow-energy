import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the service module using the path as resolved from this test file
vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
  },
}))

import { AuthProvider, useAuth } from '../AuthContext'
import { authService } from '../../services/authService'
import toast from 'react-hot-toast'

const TestConsumer = () => {
  const auth = useAuth()

  return (
    <div>
      <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</div>
      <div data-testid="isAuthenticated">{String(auth.isAuthenticated)}</div>
      <div data-testid="loading">{String(auth.loading)}</div>

      <button onClick={async () => await auth.login({ email: 'a', password: 'b' })}>
        do-login
      </button>
      <button onClick={async () => await auth.logout()}>do-logout</button>
      <button onClick={() => auth.updateUser({ id: 5, role: 'team_leader', teamId: 10 })}>
        set-user
      </button>
      <button
        onClick={() => {
          const ok = auth.hasPermission('employee')
          const span = document.getElementById('perm')
          if (span) span.textContent = String(ok)
        }}
      >
        check-perm
      </button>
      <button
        onClick={() => {
          const ok = auth.canAccessWorkOrder({ teamId: 10, assignedTo: 5 })
          const span = document.getElementById('access')
          if (span) span.textContent = String(ok)
        }}
      >
        check-access
      </button>

      <span id="perm" />
      <span id="access" />
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('initializes unauthenticated when no token', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

  await waitFor(() => expect(screen.getAllByTestId('isAuthenticated')[0].textContent).toBe('false'))
  expect(screen.getAllByTestId('user')[0].textContent).toBe('null')
  })

  it('login stores tokens and sets user', async () => {
    const user = { id: 1, role: 'employee' }
    authService.login.mockResolvedValueOnce({ accessToken: 'a', refreshToken: 'r', user })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

  userEvent.click(screen.getAllByText('do-login')[0])

    await waitFor(() => expect(localStorage.getItem('accessToken')).toBe('a'))
    expect(localStorage.getItem('refreshToken')).toBe('r')
  await waitFor(() => expect(screen.getAllByTestId('isAuthenticated')[0].textContent).toBe('true'))
  expect(screen.getAllByTestId('user')[0].textContent).toContain('"id":1')
  })

  it('logout clears tokens and calls toast', async () => {
    // seed tokens
    localStorage.setItem('accessToken', 't')
    localStorage.setItem('refreshToken', 'r')
    authService.logout.mockResolvedValueOnce()
    // prevent initializeAuth from throwing when tokens exist
    authService.getCurrentUser.mockResolvedValueOnce({ user: { id: 1, role: 'employee' } })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

  userEvent.click(screen.getAllByText('do-logout')[0])

    await waitFor(() => expect(localStorage.getItem('accessToken')).toBeNull())
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(toast.success).toHaveBeenCalled()
  })

  it('hasPermission and canAccessWorkOrder behave correctly', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

  // getAllByText used because StrictMode & test environment may render twice
  userEvent.click(screen.getAllByText('set-user')[0])
    // updateUser is sync, but allow for multiple renders — assert eventually one consumer updates
    await waitFor(() => {
      const users = screen.getAllByTestId('user')
      expect(Array.from(users).some((u) => u.textContent.includes('"role":"team_leader"'))).toBe(true)
    })

    userEvent.click(screen.getAllByText('check-perm')[0])
    await waitFor(() => {
      expect(Array.from(document.querySelectorAll('#perm')).some((s) => s.textContent === 'true')).toBe(true)
    })

    userEvent.click(screen.getAllByText('check-access')[0])
    await waitFor(() => {
      expect(Array.from(document.querySelectorAll('#access')).some((s) => s.textContent === 'true')).toBe(true)
    })
  })
})
