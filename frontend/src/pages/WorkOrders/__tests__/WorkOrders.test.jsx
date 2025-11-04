import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// static toast mock (used by component)
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

// We'll mock the service and auth context inside each test using vi.doMock +
// vi.resetModules so each test gets an isolated module instance. That avoids
// parallel-test interference and hoisting issues.

describe('WorkOrders', () => {
  beforeEach(() => {
    // Clear any previous mock calls/implementations between tests
    vi.clearAllMocks()
  })

  it('renders table and a work order row for admin user', async () => {
    // Arrange: mock modules per-test so the component uses these implementations
  vi.resetModules()
  // mock the same module specifier the component uses
  vi.doMock('../../services/workOrderService', () => {
      return {
        workOrderService: {
          getWorkOrders: () => Promise.resolve({
            workOrders: [
              {
                id: 123,
                title: 'Fix broken AC',
                description: 'AC unit not cooling',
                status: 'pending',
                priority: 'high',
                assigned_to_name: 'Juan',
                created_at: new Date().toISOString(),
              }
            ],
            pagination: { totalItems: 1, totalPages: 1 }
          }),
          getWorkOrderStats: () => Promise.resolve({ stats: { total: 1, pending: 1, in_progress: 0, completed: 0 } }),
          updateStatus: vi.fn(),
          assignWorkOrder: vi.fn(),
        }
      }
    })

    vi.doMock('../../context/AuthContext', () => ({
      useAuth: () => ({ user: { id: 1, role: 'admin', teamId: 1 } })
    }))

    // Import component after mocks are configured so it consumes the mocked modules
    const { default: WorkOrders } = await import('../WorkOrders')

    render(
      <MemoryRouter>
        <WorkOrders />
      </MemoryRouter>
    )

    // Now the row should be rendered
    expect(await screen.findByText(/Fix broken AC/i)).toBeInTheDocument()

    // spinner should be gone
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument())
  })

  it('shows empty state for employee with no work orders', async () => {

    vi.resetModules()
    vi.doMock('../../services/workOrderService', () => ({
      workOrderService: {
        getWorkOrders: () => Promise.resolve({ workOrders: [], pagination: { totalItems: 0, totalPages: 0 } }),
        getWorkOrderStats: () => Promise.resolve({ stats: { total: 0, pending: 0, in_progress: 0, completed: 0 } }),
      }
    }))

    vi.doMock('../../context/AuthContext', () => ({
      useAuth: () => ({ user: { id: 2, role: 'employee', teamId: 2 } })
    }))

    const { default: WorkOrders } = await import('../WorkOrders')

    render(
      <MemoryRouter>
        <WorkOrders />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/No se encontraron órdenes de trabajo/i)).toBeInTheDocument()
    })

    // employee-specific subtext — match partially to be robust
    expect(screen.getByText((content) => /No tienes órdenes/.test(content))).toBeInTheDocument()
  })
})
