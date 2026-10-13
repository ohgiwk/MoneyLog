import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MonthPickerDialog from './MonthPickerDialog'

describe('MonthPickerDialog', () => {
  it('表示中の月の年が開かれ、その月が選択状態になる', () => {
    render(<MonthPickerDialog month="2024-03" onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getByText('2024年')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3月' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '4月' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('月を押すと YYYY-MM 形式で onSelect が呼ばれる', () => {
    const onSelect = vi.fn()
    render(<MonthPickerDialog month="2024-03" onSelect={onSelect} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '9月' }))
    expect(onSelect).toHaveBeenCalledWith('2024-09')
  })

  it('年を送ってから月を押すと、その年の月が選ばれる', () => {
    const onSelect = vi.fn()
    render(<MonthPickerDialog month="2024-12" onSelect={onSelect} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '›' }))
    expect(screen.getByText('2025年')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '12月' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: '1月' }))
    expect(onSelect).toHaveBeenCalledWith('2025-01')
  })

  it('年を戻すと前年の月が選ばれる', () => {
    const onSelect = vi.fn()
    render(<MonthPickerDialog month="2024-01" onSelect={onSelect} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '‹' }))
    fireEvent.click(screen.getByRole('button', { name: '12月' }))
    expect(onSelect).toHaveBeenCalledWith('2023-12')
  })
})
