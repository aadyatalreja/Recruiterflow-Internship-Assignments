import type { ReactNode } from 'react'
import type { Category } from '../domain/types'
import { ActivitiesIcon, FoodIcon, OtherIcon, StayIcon, TravelIcon } from './Icons'

/** How each category is drawn: its icon and a short hint of what goes in it. */
export const CATEGORY_STYLE: Record<Category, { icon: ReactNode; hint: string }> = {
  Food: { icon: <FoodIcon />, hint: 'Meals, snacks and drinks' },
  Travel: { icon: <TravelIcon />, hint: 'Cabs, fuel and tickets' },
  Stay: { icon: <StayIcon />, hint: 'Hotels, villas and hostels' },
  Activities: { icon: <ActivitiesIcon />, hint: 'Tours, rentals and entry fees' },
  Other: { icon: <OtherIcon />, hint: 'Anything else' },
}
