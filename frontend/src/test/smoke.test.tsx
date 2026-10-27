import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('jsdom environment', () => {
  it('renders React and supports jest-dom matchers', () => {
    render(<button type="button">Save</button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})
