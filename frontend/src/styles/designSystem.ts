import { theme } from "antd";

// ── Primitive palette ─────────────────────────────────────────────────────────

export const palette = {
  violet: {
    50:  "#f5f3ff",
    100: "#ece9fd",
    200: "#d9d4fb",
    300: "#bbb5f7",
    400: "#9b92f2",
    500: "#7b6eea",
    600: "#5f4fe0",
    700: "#3b28cc",  // brand primary
    800: "#2e1fa3",
    900: "#231880",
    950: "#140e52",
  },
  slate: {
    50:  "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  green:  { main: "#16a34a", surface: "#dcfce7", dark: "#14532d" },
  amber:  { main: "#d97706", surface: "#fef3c7", dark: "#78350f" },
  red:    { main: "#dc2626", surface: "#fee2e2", dark: "#7f1d1d" },
  cyan:   { main: "#0891b2", surface: "#cffafe", dark: "#164e63" },
  violet2:{ main: "#7c3aed", surface: "#f5f3ff", dark: "#4c1d95" },
  pink:   { main: "#be185d", surface: "#fce7f3", dark: "#500724" },
  orange: { main: "#ea580c", surface: "#ffedd5", dark: "#431407" },
  teal:   { main: "#0d9488", surface: "#ccfbf1", dark: "#134e4a" },
  blue:   { main: "#1d4ed8", surface: "#dbeafe", dark: "#1e3a8a" },
} as const;

// ── Semantic design tokens ─────────────────────────────────────────────────────

export const tokens = {
  colors: {
    // Brand
    primary:              palette.violet[700],
    primaryDark:          palette.violet[800],
    primaryLight:         palette.violet[600],
    primaryLighter:       palette.violet[500],
    primarySurface:       palette.violet[50],
    primarySurfaceDeep:   palette.violet[100],
    primarySurfaceMuted:  palette.violet[200],

    // Status with surfaces
    success:        palette.green.main,
    successSurface: palette.green.surface,
    successDark:    palette.green.dark,
    warning:        palette.amber.main,
    warningSurface: palette.amber.surface,
    warningDark:    palette.amber.dark,
    error:          palette.red.main,
    errorSurface:   palette.red.surface,
    errorDark:      palette.red.dark,
    info:           palette.violet[700],
    infoSurface:    palette.violet[50],

    // Surface hierarchy
    surface0: "#ffffff",     // card / panel
    surface1: "#f6f7f9",     // layout bg — cool near-white so violet reads as accent, not ambient wash
    surface2: "#eef1f5",     // hover / subtle (neutral)
    surface3: "#e9e6fd",     // selected / active (brand tint — reserved for real selection)

    // Text hierarchy
    textPrimary:   "#0f0a2e",
    textSecondary: palette.slate[600],
    textTertiary:  palette.slate[400],
    textDisabled:  palette.slate[300],
    textInverse:   "#ffffff",
    textLink:      palette.violet[700],
    textLinkHover: palette.violet[600],

    // Borders — neutral hairlines (Hex/Default: crisp 1px, not violet-tinted)
    borderSubtle:  "#eceef2",
    borderDefault: "#e2e5ec",
    borderStrong:  palette.slate[400],

    // Legacy aliases (keep for backward compat)
    border: palette.slate[200],   // was tokens.colors.border
    bg:     "#ffffff",            // was tokens.colors.bg

    // Sidebar dark
    sidebarBg:              palette.slate[900],
    sidebarItemHover:       "rgba(255,255,255,0.06)",
    sidebarItemActiveBg:    "rgba(99,71,221,0.22)",
    sidebarActiveIndicator: "#7b6eea",
    sidebarText:            "rgba(255,255,255,0.65)",
    sidebarTextActive:      "#ffffff",
    sidebarBorder:          "rgba(255,255,255,0.07)",
    sidebarIcon:            "rgba(255,255,255,0.50)",
    sidebarIconActive:      "rgba(255,255,255,0.92)",
  },

  fontFamily: {
    base: "'Heebo', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
  },

  fontSize: {
    "2xs": 10, xs: 12, sm: 13, base: 14, md: 16, lg: 18,
    xl: 20, "2xl": 24, "3xl": 28, "4xl": 32, "5xl": 40, "6xl": 48,
  },

  fontWeight: {
    light: 300, regular: 400, medium: 500,
    semibold: 600, bold: 700, extrabold: 800,
  },

  space: {
    0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 3.5: 14,
    4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 9: 36, 10: 40,
    12: 48, 14: 56, 16: 64, 20: 80, 24: 96,
  },

  radius: {
    none: 0, xs: 2, sm: 4, md: 6, lg: 8, xl: 12,
    "2xl": 16, "3xl": 24, full: 9999,
  },

  shadow: {
    none:     "none",
    xs:       "0 1px 2px rgba(16,24,40,0.04)",
    sm:       "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
    md:       "0 4px 6px rgba(16,24,40,0.05), 0 2px 4px rgba(16,24,40,0.04)",
    lg:       "0 12px 20px -6px rgba(16,24,40,0.10), 0 4px 8px -4px rgba(16,24,40,0.06)",
    xl:       "0 24px 32px -12px rgba(16,24,40,0.14), 0 8px 16px -8px rgba(16,24,40,0.08)",
    // Layered "surface ring + soft drop" — real depth without heaviness (Hex)
    card:     "0 0 0 1px rgba(16,24,40,0.04), 0 1px 2px rgba(16,24,40,0.04), 0 2px 8px -2px rgba(16,24,40,0.05)",
    cardHover:"0 0 0 1px rgba(59,40,204,0.10), 0 2px 4px rgba(16,24,40,0.05), 0 12px 24px -8px rgba(16,24,40,0.12)",
    dropdown: "0 8px 24px rgba(16,24,40,0.12), 0 2px 8px rgba(16,24,40,0.06)",
    modal:    "0 24px 48px rgba(16,24,40,0.18), 0 8px 24px rgba(16,24,40,0.08)",
    focus:    "0 0 0 3px rgba(59,40,204,0.15)",
  },

  duration: {
    instant: "0ms", fast: "100ms", base: "200ms",
    slow: "300ms", slower: "500ms",
  },

  easing: {
    in:     "cubic-bezier(0.4, 0, 1, 1)",
    out:    "cubic-bezier(0, 0, 0.2, 1)",
    inOut:  "cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },

  zIndex: {
    base: 0, raised: 10, dropdown: 100, sticky: 200,
    fixed: 300, overlay: 400, modal: 500, notification: 600, tooltip: 700,
  },

  layout: {
    sidebarWidth:       248,
    headerHeight:       56,
    contentMaxWidth:    1440,
    contentMaxNarrow:   960,
    pagePaddingDesktop: 28,
    pagePaddingMobile:  16,
  },
} as const;

// ── Chart / data-viz palette ───────────────────────────────────────────────────
// 10 colors: colorblind-friendly, WCAG 3:1 on white

export const chartPalette: readonly string[] = [
  tokens.colors.primary,      // #3b28cc  violet
  palette.green.main,         // #16a34a  green
  palette.cyan.main,          // #0891b2  cyan
  palette.amber.main,         // #d97706  amber
  palette.teal.main,          // #0d9488  teal
  palette.blue.main,          // #1d4ed8  blue
  palette.red.main,           // #dc2626  red
  palette.violet2.main,       // #7c3aed  violet2
  palette.orange.main,        // #ea580c  orange
  palette.pink.main,          // #be185d  pink
];

// ── Ant Design theme ───────────────────────────────────────────────────────────

export const appTheme = {
  algorithm: theme.defaultAlgorithm,

  token: {
    // Brand
    colorPrimary:   tokens.colors.primary,
    colorInfo:      tokens.colors.info,
    colorSuccess:   tokens.colors.success,
    colorWarning:   tokens.colors.warning,
    colorError:     tokens.colors.error,

    // Surfaces
    colorBgBase:      tokens.colors.surface0,
    colorBgLayout:    tokens.colors.surface1,
    colorBgContainer: tokens.colors.surface0,
    colorBgElevated:  tokens.colors.surface0,
    colorBgSpotlight: "rgba(15,10,46,0.85)",

    // Text
    colorText:          tokens.colors.textPrimary,
    colorTextSecondary: tokens.colors.textSecondary,
    colorTextTertiary:  tokens.colors.textTertiary,
    colorTextDisabled:  tokens.colors.textDisabled,
    colorTextBase:      tokens.colors.textPrimary,

    // Borders
    colorBorder:          tokens.colors.borderDefault,
    colorBorderSecondary: tokens.colors.borderSubtle,
    colorSplit:           tokens.colors.borderSubtle,

    // Typography
    fontFamily:         tokens.fontFamily.base,
    fontSize:           tokens.fontSize.base,
    fontSizeSM:         tokens.fontSize.sm,
    fontSizeLG:         tokens.fontSize.md,
    fontSizeXL:         tokens.fontSize.xl,
    fontSizeHeading1:   tokens.fontSize["4xl"],
    fontSizeHeading2:   tokens.fontSize["3xl"],
    fontSizeHeading3:   tokens.fontSize["2xl"],
    fontSizeHeading4:   tokens.fontSize.xl,
    fontSizeHeading5:   tokens.fontSize.md,

    // Radius
    borderRadius:   tokens.radius.sm,
    borderRadiusSM: tokens.radius.xs,
    borderRadiusLG: tokens.radius.md,
    borderRadiusXS: 2,

    // Shadows
    boxShadow:       tokens.shadow.sm,
    boxShadowSecondary: tokens.shadow.xs,

    // Motion
    motionDurationFast: "100ms",
    motionDurationMid:  "200ms",
    motionDurationSlow: "300ms",
    motionEaseOut:           "cubic-bezier(0, 0, 0.2, 1)",
    motionEaseIn:            "cubic-bezier(0.4, 0, 1, 1)",
    motionEaseInOut:         "cubic-bezier(0.4, 0, 0.2, 1)",
    motionEaseOutBack:       "cubic-bezier(0.34, 1.56, 0.64, 1)",

    // Focus
    controlOutline:        "rgba(59,40,204,0.15)",
    controlOutlineWidth:   3,

    // Control sizes
    controlHeight:     36,
    controlHeightSM:   30,
    controlHeightLG:   42,

    // Line height
    lineHeight:   1.5,
    lineHeightSM: 1.375,
    lineHeightLG: 1.625,

    // Link
    colorLink:      tokens.colors.textLink,
    colorLinkHover: tokens.colors.textLinkHover,
  },

  components: {

    // ── Layout ───────────────────────────────────────────────────
    Layout: {
      headerHeight:     tokens.layout.headerHeight,
      headerPadding:    "0 20px",
      headerBg:         tokens.colors.surface0,
      siderBg:          tokens.colors.sidebarBg,
      bodyBg:           tokens.colors.surface1,
      footerBg:         tokens.colors.surface1,
      triggerBg:        tokens.colors.sidebarBg,
    },

    // ── Sider (sidebar) ──────────────────────────────────────────
    Menu: {
      darkItemBg:              tokens.colors.sidebarBg,
      darkItemSelectedBg:      tokens.colors.sidebarItemActiveBg,
      darkItemHoverBg:         tokens.colors.sidebarItemHover,
      darkItemColor:           tokens.colors.sidebarText,
      darkItemSelectedColor:   tokens.colors.sidebarTextActive,
      darkItemHoverColor:      tokens.colors.sidebarTextActive,
      darkSubMenuItemBg:       tokens.colors.sidebarBg,
      darkGroupTitleColor:     "rgba(255,255,255,0.35)",
      darkPopupBg:             palette.slate[800],

      itemBorderRadius:  tokens.radius.sm,
      itemMarginInline:  12,
      itemMarginBlock:   2,
      itemHeight:        40,
      itemPaddingInline: 16,
      iconSize:          16,
      iconMarginInlineEnd: 10,
      fontSize:          tokens.fontSize.sm,

      // Light menu (for inline content menus)
      itemBg:            tokens.colors.surface0,
      itemSelectedBg:    tokens.colors.primarySurface,
      itemSelectedColor: tokens.colors.primary,
      itemHoverBg:       tokens.colors.surface2,
      itemHoverColor:    tokens.colors.primary,
      activeBarBorderWidth: 0,
    },

    // ── Card ─────────────────────────────────────────────────────
    Card: {
      colorBorderSecondary: tokens.colors.borderSubtle,
      borderRadiusLG:       tokens.radius.xl,
      headerFontSize:       tokens.fontSize.base,
      headerFontSizeSM:     tokens.fontSize.sm,
      headerHeight:         48,
      headerHeightSM:       38,
      bodyPadding:          24,
      bodyPaddingSM:        16,
      paddingLG:            24,
    },

    // ── Table ─────────────────────────────────────────────────────
    Table: {
      headerBg:              "#f4f6f9",
      headerColor:           tokens.colors.textSecondary,
      headerSortActiveBg:    "#eef1f5",
      headerSortHoverBg:     tokens.colors.surface2,
      headerSplitColor:      tokens.colors.borderSubtle,
      rowHoverBg:            tokens.colors.surface2,
      rowSelectedBg:         tokens.colors.primarySurfaceDeep,
      rowSelectedHoverBg:    tokens.colors.primarySurfaceMuted,
      rowExpandedBg:         tokens.colors.primarySurface,
      borderColor:           tokens.colors.borderSubtle,
      footerBg:              tokens.colors.surface1,
      footerColor:           tokens.colors.textSecondary,
      filterDropdownBg:      tokens.colors.surface0,
      stickyScrollBarBg:     tokens.colors.borderDefault,
      cellPaddingBlock:      12,
      cellPaddingInline:     16,
      cellPaddingBlockSM:    8,
      cellPaddingInlineSM:   12,
      fontSize:              tokens.fontSize.base,
      fontWeightStrong:      tokens.fontWeight.semibold,
    },

    // ── Input ──────────────────────────────────────────────────────
    Input: {
      activeShadow:        `0 0 0 3px rgba(59,40,204,0.15)`,
      activeBorderColor:   tokens.colors.primary,
      hoverBorderColor:    tokens.colors.primaryLight,
      colorBgContainer:    tokens.colors.surface0,
      borderRadius:        tokens.radius.lg,
      paddingBlock:        8,
      paddingInline:       12,
    },

    // ── Select ─────────────────────────────────────────────────────
    Select: {
      optionSelectedBg:        tokens.colors.primarySurface,
      optionActiveBg:          tokens.colors.surface2,
      multipleItemBg:          tokens.colors.primarySurface,
      optionSelectedFontWeight: tokens.fontWeight.semibold,
      selectorBg:              tokens.colors.surface0,
      borderRadius:            tokens.radius.lg,
      optionFontSize:          tokens.fontSize.base,
      optionHeight:            36,
    },

    // ── Form ────────────────────────────────────────────────────────
    Form: {
      itemMarginBottom:      20,
      verticalLabelPadding:  "0 0 4px",
      labelColor:            tokens.colors.textSecondary,
      labelFontSize:         tokens.fontSize.sm,
      labelHeight:           22,
      labelColonMarginInlineStart: 2,
      labelColonMarginInlineEnd:   8,
    },

    // ── DatePicker ──────────────────────────────────────────────────
    DatePicker: {
      activeShadow:          `0 0 0 3px rgba(59,40,204,0.15)`,
      activeBorderColor:     tokens.colors.primary,
      hoverBorderColor:      tokens.colors.primaryLight,
      cellActiveWithRangeBg: tokens.colors.primarySurface,
      colorBgContainer:      tokens.colors.surface0,
      borderRadius:          tokens.radius.lg,
    },

    // ── Button ──────────────────────────────────────────────────────
    Button: {
      borderRadius:        tokens.radius.lg,
      borderRadiusSM:      tokens.radius.sm,
      borderRadiusLG:      tokens.radius.lg,
      fontWeight:          tokens.fontWeight.medium,
      // Flat, premium buttons: whisper-soft brand tint instead of a heavy drop
      primaryShadow:       "0 1px 2px 0 rgba(59,40,204,0.16)",
      defaultShadow:       tokens.shadow.xs,
      dangerShadow:        "0 1px 2px 0 rgba(220,38,38,0.16)",
      contentFontSize:     tokens.fontSize.base,
      contentFontSizeSM:   tokens.fontSize.xs,
      contentFontSizeLG:   tokens.fontSize.md,
      paddingBlock:        8,
      paddingInline:       16,
      paddingBlockSM:      5,
      paddingInlineSM:     12,
      paddingBlockLG:      10,
      paddingInlineLG:     20,
    },

    // ── Tag ─────────────────────────────────────────────────────────
    Tag: {
      borderRadiusSM: tokens.radius.sm,
      fontSizeSM:     tokens.fontSize.xs,
      lineHeightSM:   1.5,
    },

    // ── Badge ───────────────────────────────────────────────────────
    Badge: {
      colorBgContainer: tokens.colors.surface0,
    },

    // ── Tabs ────────────────────────────────────────────────────────
    Tabs: {
      cardBg:             tokens.colors.surface0,
      cardGutter:         2,
      horizontalMargin:   "0",
      inkBarColor:        tokens.colors.primary,
      itemColor:          tokens.colors.textSecondary,
      itemSelectedColor:  tokens.colors.primary,
      itemHoverColor:     tokens.colors.primaryLight,
      itemActiveColor:    tokens.colors.primary,
      fontSize:           tokens.fontSize.sm,
      fontWeightStrong:   tokens.fontWeight.semibold,
      titleFontSize:      tokens.fontSize.base,
      titleFontSizeLG:    tokens.fontSize.md,
      titleFontSizeSM:    tokens.fontSize.sm,
    },

    // ── Steps ───────────────────────────────────────────────────────
    Steps: {
      colorPrimary:         tokens.colors.primary,
      iconSize:             28,
      iconFontSize:         tokens.fontSize.sm,
      titleLineHeight:      20,
      descriptionMaxWidth:  160,
      dotSize:              8,
      dotCurrentSize:       10,
      finishIconBorderColor: tokens.colors.primary,
    },

    // ── Modal ────────────────────────────────────────────────────────
    Modal: {
      borderRadiusLG:    tokens.radius["2xl"],
      titleFontSize:     tokens.fontSize.lg,
      titleLineHeight:   1.4,
      contentBg:         tokens.colors.surface0,
      headerBg:          tokens.colors.surface0,
      footerBg:          tokens.colors.surface0,
    },

    // ── Drawer ───────────────────────────────────────────────────────
    Drawer: {
      borderRadiusLG:  tokens.radius.xl,
      colorBgContainer:tokens.colors.surface0,
    },

    // ── Tooltip ──────────────────────────────────────────────────────
    Tooltip: {
      borderRadius:    tokens.radius.md,
      fontSize:        tokens.fontSize.xs,
      colorBgSpotlight:"rgba(15,10,46,0.88)",
      paddingXS:       6,
    },

    // ── Popover ──────────────────────────────────────────────────────
    Popover: {
      borderRadiusLG:    tokens.radius.xl,
      innerPaddingBlock: 12,
      innerPaddingInline:16,
    },

    // ── Dropdown ─────────────────────────────────────────────────────
    Dropdown: {
      borderRadiusLG:    tokens.radius.lg,
      paddingBlock:      6,
      colorBgContainer:  tokens.colors.surface0,
    },

    // ── Notification ─────────────────────────────────────────────────
    Notification: {
      borderRadiusLG: tokens.radius.xl,
      paddingMD:      16,
      paddingLG:      20,
      colorBgContainer: tokens.colors.surface0,
      fontSize:       tokens.fontSize.base,
    },

    // ── Message ──────────────────────────────────────────────────────
    Message: {
      borderRadius:     tokens.radius.lg,
      contentPadding:   "10px 16px",
      contentBg:        tokens.colors.surface0,
    },

    // ── Alert ────────────────────────────────────────────────────────
    Alert: {
      borderRadiusLG: tokens.radius.lg,
      borderRadius:   tokens.radius.md,
      fontSize:       tokens.fontSize.sm,
      withDescriptionPadding: "12px 16px",
    },

    // ── Pagination ───────────────────────────────────────────────────
    Pagination: {
      borderRadius:   tokens.radius.md,
      itemActiveBg:   tokens.colors.primarySurface,
      itemSize:       32,
      fontSize:       tokens.fontSize.sm,
    },

    // ── Collapse ─────────────────────────────────────────────────────
    Collapse: {
      headerBg:      tokens.colors.surface1,
      contentBg:     tokens.colors.surface0,
      borderRadiusLG:tokens.radius.lg,
      fontSize:      tokens.fontSize.sm,
    },

    // ── Statistic ────────────────────────────────────────────────────
    Statistic: {
      titleFontSize:   tokens.fontSize.xs,
      contentFontSize: tokens.fontSize["3xl"],
    },

    // ── Switch ───────────────────────────────────────────────────────
    Switch: {
      colorPrimary:       tokens.colors.primary,
      colorPrimaryHover:  tokens.colors.primaryLight,
      handleShadow:       tokens.shadow.xs,
    },

    // ── Checkbox & Radio ─────────────────────────────────────────────
    Checkbox: {
      borderRadiusSM:  tokens.radius.xs,
      colorPrimary:    tokens.colors.primary,
      colorPrimaryHover:tokens.colors.primaryLight,
    },
    Radio: {
      colorPrimary:    tokens.colors.primary,
      colorPrimaryHover:tokens.colors.primaryLight,
    },

    // ── Progress ─────────────────────────────────────────────────────
    Progress: {
      colorSuccess:    tokens.colors.success,
      remainingColor:  tokens.colors.borderSubtle,
      defaultColor:    tokens.colors.primary,
      lineBorderRadius:tokens.radius.full,
    },

    // ── Skeleton ─────────────────────────────────────────────────────
    Skeleton: {
      colorFill:       tokens.colors.surface2,
      colorFillContent:tokens.colors.surface3,
      borderRadiusSM:  tokens.radius.md,
    },

    // ── Spin ─────────────────────────────────────────────────────────
    Spin: {
      colorPrimary:    tokens.colors.primary,
    },

    // ── Upload ───────────────────────────────────────────────────────
    Upload: {
      colorPrimary:    tokens.colors.primary,
      colorFillAlter:  tokens.colors.surface1,
      borderRadius:    tokens.radius.lg,
    },

    // ── Empty ────────────────────────────────────────────────────────
    Empty: {
      colorTextDisabled: tokens.colors.textTertiary,
    },

    // ── Breadcrumb ───────────────────────────────────────────────────
    Breadcrumb: {
      fontSize:          tokens.fontSize.sm,
      iconFontSize:      tokens.fontSize.xs,
      itemColor:         tokens.colors.textTertiary,
      lastItemColor:     tokens.colors.textPrimary,
      linkColor:         tokens.colors.textSecondary,
      linkHoverColor:    tokens.colors.primary,
      separatorColor:    tokens.colors.textDisabled,
      separatorMargin:   8,
    },

    // ── Divider ──────────────────────────────────────────────────────
    Divider: {
      colorSplit:     tokens.colors.borderSubtle,
      fontSize:       tokens.fontSize.xs,
      fontSizeLG:     tokens.fontSize.sm,
    },
  },
};
