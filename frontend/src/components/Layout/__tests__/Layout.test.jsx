import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material'
import theme from '../../../theme/theme'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }))
import { useAuth } from '../../../context/AuthContext'
import Layout from '../Layout'

describe('Layout', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      user: { firstName: 'Jane', lastName: 'Doe', role: 'employee', id: 5, teamId: 10 },
      logout: vi.fn(),
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders header, drawer items and children', () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ThemeProvider theme={theme}>
          <Layout>
            <div data-testid="child">child</div>
          </Layout>
        </ThemeProvider>
      </MemoryRouter>
    )

  expect(screen.getByText('Work Order Management System')).toBeInTheDocument()
  // There are multiple 'Work Orders' nodes (title and list item). Pick any.
  expect(screen.getAllByText('Work Orders')[0]).toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})
