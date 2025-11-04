// @vitest-environment jsdom
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoadingSpinner from './LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders message and spinner', () => {
    render(<LoadingSpinner message="Please wait..." />)
    expect(screen.getByText(/Please wait.../i)).toBeTruthy()
    // circular progress renders as role='progressbar'
    expect(screen.getByRole('progressbar')).toBeTruthy()
  })
})
