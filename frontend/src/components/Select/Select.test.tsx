import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import Select from './Select'

const OPTIONS = [
  { value: 'food', label: 'Food' },
  { value: 'travel', label: 'Travel' },
  { value: 'stay', label: 'Stay' },
]

function Harness() {
  const [value, setValue] = useState('')
  return (
    <>
      <label id="pick-label" htmlFor="pick">
        Category
      </label>
      <Select id="pick" labelId="pick-label" value={value} options={OPTIONS} placeholder="Choose" onChange={setValue} />
    </>
  )
}

function setup() {
  const user = userEvent.setup()
  render(<Harness />)
  return { user, combobox: screen.getByRole('combobox', { name: 'Category' }) }
}

describe('Select', () => {
  it('opens with the keyboard, moves with the arrows and chooses with Enter', async () => {
    const { user, combobox } = setup()
    combobox.focus()

    await user.keyboard('{ArrowDown}')
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox', { name: 'Category' })).toBeInTheDocument()

    await user.keyboard('{ArrowDown}{Enter}')
    expect(combobox).toHaveAttribute('aria-expanded', 'false')
    expect(combobox).toHaveTextContent('Travel')
    expect(combobox).toHaveFocus()
  })

  it('points aria-activedescendant at the highlighted option', async () => {
    const { user, combobox } = setup()
    combobox.focus()

    await user.keyboard('{ArrowDown}{End}')
    const active = combobox.getAttribute('aria-activedescendant')
    expect(active).not.toBeNull()
    expect(document.getElementById(active ?? '')).toHaveTextContent('Stay')
  })

  it('closes on Escape without changing the value', async () => {
    const { user, combobox } = setup()
    combobox.focus()

    await user.keyboard('{ArrowDown}{ArrowDown}{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(combobox).toHaveTextContent('Choose')
  })

  it('jumps to an option by its first letter', async () => {
    const { user, combobox } = setup()
    combobox.focus()

    await user.keyboard('s{Enter}')
    expect(combobox).toHaveTextContent('Stay')
  })

  it('marks the chosen option as selected and chooses by click', async () => {
    const { user, combobox } = setup()

    await user.click(combobox)
    await user.click(screen.getByRole('option', { name: 'Food' }))
    await user.click(combobox)
    expect(screen.getByRole('option', { name: 'Food' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Travel' })).toHaveAttribute('aria-selected', 'false')
  })
})
