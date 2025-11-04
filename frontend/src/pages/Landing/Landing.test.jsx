import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Landing';

// --- Top-level mocks ---
// Provide a mockNavigate function that will be returned by useNavigate
const mockNavigate = vi.fn();

// Partially mock react-router-dom while preserving all real exports
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Landing Page', () => {
  it('renders the main heading and hero section', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    // Check if the main H1 heading is rendered (avoid matching other headings)
    const heading = screen.getByRole('heading', { level: 1, name: /WorkFlow Energy/i });
    expect(heading).toBeTruthy();

    // Check if the hero section description is rendered
    const description = screen.getByRole('heading', { level: 5, name: /Sistema de Gestión de Órdenes de Trabajo para el Sector Energético/i });
    expect(description).toBeTruthy();

    // Check if the logo is rendered
    const logo = screen.getByAltText(/WorkFlow Energy/i);
    expect(logo).toBeTruthy();

    // Check if the hero image is rendered
    const heroImage = screen.getByAltText(/Industrial Plant/i);
    expect(heroImage).toBeTruthy();
  });

  it('renders call-to-action buttons and handles navigation', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    // There are multiple "Iniciar Sesión" buttons on the page (hero + footer),
    // query all and use the first one for the hero section check.
    const loginButtons = screen.getAllByRole('button', { name: /Iniciar Sesión/i });
    expect(loginButtons.length).toBeGreaterThan(0);

    // Use the first occurrence for navigation check
    fireEvent.click(loginButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/login');

    // Registrarse may also appear multiple times; pick the first occurrence
    const registerButtons = screen.getAllByRole('button', { name: /Registrarse/i });
    expect(registerButtons.length).toBeGreaterThan(0);
    fireEvent.click(registerButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });

  it('renders all feature cards', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    // Check if all feature cards are rendered (allow multiple matches)
    const features = [
      'Gestión de Órdenes',
      'Control por Roles',
      'Métricas en Tiempo Real',
      'Sincronización Offline',
      'Multiplataforma',
      'Seguro y Auditable',
    ];

    features.forEach((feature) => {
      const matches = screen.getAllByText(new RegExp(feature, 'i'));
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it('renders all role cards', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    // Check if all role cards are rendered (allow multiple matches)
    const roles = ['Empleado', 'Jefe de Equipo', 'Gerente/Supervisor'];

    roles.forEach((role) => {
      const matches = screen.getAllByText(new RegExp(role, 'i'));
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});