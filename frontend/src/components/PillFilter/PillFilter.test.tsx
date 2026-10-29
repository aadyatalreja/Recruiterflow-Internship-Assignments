import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import PillFilter from './PillFilter'

const OPTIONS = ['All', 'Food', 'Travel'] as const

function Harness() {
  const [value, setValue] = useState<(typeof OPTIONS)[number]>('All')
  return <PillFilter legend="Category" name="category" options={OPTIONS} value={value} onChange={setValue} />
}

describe('PillFilter', () => {
  it('is a radio group named by its legend, with the current value checked', () => {
    render(<Harness />)
    expect(screen.getByRole('group', { name: 'Category' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked()
  })

  it('changes the value by click and by arrow keys', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('radio', { name: 'Food' }))
    expect(screen.getByRole('radio', { name: 'Food' })).toBeChecked()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Travel' })).toBeChecked()
  })
})
