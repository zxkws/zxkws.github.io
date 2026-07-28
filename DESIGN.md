# 光域 LightSpace Design System

This interface uses the Supabase-inspired design language from
`awesome-design-md/design-md/supabase/DESIGN.md`, adapted for a personal
AI and digital-human research portal that also acts as an authenticated
operations workspace.

## Product modes

- The home route introduces LightSpace / 光域 as a personal digital-human lab,
  exposes product ideas and useful public tools, and makes the private
  workspace discoverable.
- `/product-lab` turns the `product-ideas` repository into a public delivery
  board. It must distinguish available MVPs, foundations, and validation work
  without overstating completion.
- Feature routes use the workspace shell: compact header, persistent desktop
  sidebar, mobile drawer, bounded content stage, and the command palette.
- Authentication changes available actions, not the visual identity.
- Public content must remain useful when the user is signed out.

## Visual language

- Use white `#ffffff` as the default canvas and near-black `#171717` for text.
- Use emerald `#3ecf8e` as the only recurring chromatic accent.
- Use emerald sparingly for the primary action, active state, status dot, or
  small icon surface. Do not turn whole sections green.
- Use `#1c1c1c` for code, system previews, and intentionally inverted sections.
- Prefer one-pixel hairlines (`#dfdfdf` or `#ededed`) over large shadows.
- Use shadows only for floating menus, dialogs, and product-interface previews.
- Do not add atmospheric gradients, glassmorphism, or decorative color clouds.

## Typography

- Use Inter and the existing Chinese system-font fallback stack.
- Display text uses weight 500, tight tracking, and short line lengths.
- Interface text normally uses 13–14px; supporting labels use a system
  monospace face at 9–11px.
- Use sentence case for Chinese headings and uppercase monospace only for small
  technical eyebrows.

## Shape and spacing

- Buttons use a 6px radius.
- Inputs and compact panels use 6–8px radii.
- Large cards and product previews use no more than a 12px radius.
- Avoid pill buttons. Pills are only for small tags and status labels.
- Base spacing is 8px. Marketing sections use 80–120px vertical spacing;
  workspace controls stay compact.

## Components

- Primary buttons: emerald background, near-black text, 6px radius.
- Secondary buttons: white or current surface, one-pixel gray border.
- Cards: flat surface, hairline border, restrained hover movement.
- Product previews: dark, dense, and made from interface elements rather than
  stock photography.
- Navigation: text-first, quiet default states, emerald reserved for the active
  indicator.
- Icons: consistent outline SVGs. Do not mix emoji with interface icons.

## Content and data

- Explain public value before private administration features.
- Use 光域 as the primary Chinese wordmark and LIGHTSPACE as its technical
  companion. Keep `zxkws` only where it is an infrastructure domain or package
  namespace.
- Use direct, specific labels such as “文本比对” or “数据库管控”.
- Display backend response values exactly as returned. Do not add date, number,
  label, or fallback formatting unless a requirement explicitly asks for it.
- Loading, empty, and error states should be visible without obscuring the rest
  of the public portal.

## Responsive behavior

- Collapse two-column hero and workspace sections into one column below 1080px.
- Collapse card grids from four to two to one column.
- Replace the workspace sidebar with a drawer below 860px.
- Keep interactive targets at least 36px high; primary mobile actions should be
  at least 44px high.
