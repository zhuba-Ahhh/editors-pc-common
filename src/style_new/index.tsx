import React, {
  useRef,
  useMemo,
  useState,
  useCallback,
  CSSProperties
} from 'react'

// @ts-ignore
import colorUtil from 'color-string'
// @ts-ignore
import { toCSS, toJSON } from 'cssjson';
// @ts-ignore
import { calculate, compare } from 'specificity';

import {
  CodeOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  FullscreenOutlined
} from '@ant-design/icons'
// @ts-ignore
import MonacoEditor from "@mybricks/code-editor";

import { deepCopy } from '../utils'
import StyleEditor, { DEFAULT_OPTIONS, StyleEditorProvider } from './StyleEditor'

import type {
  EditorProps,
  GetDefaultConfigurationProps
} from './type'
import type { Style, Options, ChangeEvent } from './StyleEditor/type'

import { useUpdateEffect } from './StyleEditor/hooks'

import css from './index.less'

interface State {
  open: boolean
  editMode: boolean
}

export default function ({editConfig}: EditorProps) {
  const {
    finalOpen,
    finalSelector
  } = useMemo(() => {
    return getDefaultConfiguration2(editConfig)
  }, [])


  const [{
    open,
    show,
    editMode,
  }, setStatus] = useState({
    open: finalOpen,
    show: finalOpen,
    editMode: true
  })
  const [key, setKey] = useState(0)

  const refresh = useCallback(() => {
    editConfig.value.set({})
    setKey(key => key + 1)
  }, [])

  function onOpenClick () {
    setStatus((status) => {
      return {
        ...status,
        show: true,
        open: !status.open
      }
    })
  }

  function onEditModeClick () {
    setStatus((status) => {
      return {
        show: true,
        open: true,
        editMode: !status.editMode
      }
    })
  }

  useUpdateEffect(() => {
    setKey(key => key + 1)
  }, [editConfig.ifRefresh?.()])

  const title = useMemo(() => {
    return (
      <div className={css.titleContainer} style={{ marginBottom: open ? 3 : 0 }}>
        <div className={css.title} onClick={onOpenClick}>
          <div
            className={`${css.icon}${open ? ` ${css.iconOpen}` : ''}`}
            data-mybricks-tip={open ? '收起' : '展开'}
          >
            <CaretRightOutlined />
          </div>
          <div>{editConfig.title}</div>
        </div>
        <div className={css.actions}>
          <div
            className={css.icon}
            data-mybricks-tip={'重置'}
            onClick={refresh}
          >
            <ReloadOutlined />
          </div>
          <div
            className={css.icon}
            data-mybricks-tip={`{content:'${editMode ? '代码编辑' : '可视化编辑'}',position:'left'}`}
            onClick={onEditModeClick}
          >
            {editMode ? <CodeOutlined /> : <AppstoreOutlined />}
          </div>
        </div>
      </div>
    )
  }, [open, editMode])

  const editor = useMemo(() => {
    if (editMode) {
      return (
        <Style editConfig={editConfig}/>
      )
    } else {
      return (
        <CssEditor {...editConfig} selector={':root'} onChange={(value: any) => {
          editConfig.value.set(deepCopy(value))
        }}/>
      )
    }
  }, [editMode])

  return {
    render: (
      <>
        {title}
        <div key={key} style={{display: open ? 'block' : 'none'}}>
          {show && editor}
        </div>
      </>
    )
  }
}

function Style ({editConfig}: EditorProps) {
  const {
    options,
    setValue,
    defaultValue
  } = useMemo(() => {
    return getDefaultConfiguration(editConfig)
  }, []);

  function setBrowserSpecificValues({ key, value }: Record<string, any>) {
    // 为不同的浏览器设置特定的属性
    const browsers: string [] = ['-webkit', '-moz', '-ms', '-o'];
    browsers.forEach(browserPrefix => {
      // 构建带浏览器前缀的属性名
      const prefixedKey = `${browserPrefix}-${key}`;
      // 设置对应的属性值
      setValue[prefixedKey] = value;
    });

    // 原始属性设置
    setValue[key] = value;
  }

  const handleChange: ChangeEvent = useCallback((value) => {
    if (Array.isArray(value)) {
      value.forEach((value) => {
        setBrowserSpecificValues(value);
      })
    } else {
      setBrowserSpecificValues(value);
    }
    editConfig.value.set(deepCopy(setValue))
  }, [])

  return (
    <StyleEditorProvider value={editConfig}>
      <StyleEditor
        defaultValue={defaultValue}
        options={options}
        onChange={handleChange}
      />
    </StyleEditorProvider>
  )
}

// code
const CSS_EDITOR_TITLE = 'CSS样式编辑'

function getDefaultValue({value, selector}: any) {
  const styleValue = deepCopy(value.get() || {})

  return parseToCssCode(styleValue, selector)
}

export interface StyleData {
  styleKey: string;
  value: string | number | boolean;
}

/**
 * 将驼峰写法改成xx-xx的css命名写法
 * @param styleKey
 */
export function toLine(styleKey: string) {
  return styleKey.replace(/([A-Z])/g, '-$1').toLowerCase();
}

export function toHump(name: String) {
  return name.replace(/\-(\w)/g, (all, letter) => {
    return letter.toUpperCase();
  });
}

function parseToCssCode(styleData: StyleData, selector: string) {
  const parseStyleData: any = {};
  for (const styleKey in styleData) {
    // @ts-ignore
    parseStyleData[toLine(styleKey)] = styleData[styleKey];
  }

  const cssJson = {
    children: {
      [selector || 'div']: {
        children: {},
        attributes: parseStyleData,
      },
    },
  };

  return toCSS(cssJson);
}

export function parseToStyleData(cssCode: string, selector: string) {
  const styleData = {};
  try {
    const cssJson = toJSON(cssCode.trim().endsWith('}') ? cssCode : (cssCode + '}'));// 包bug
    const cssJsonData = cssJson?.children?.[selector || 'div']?.attributes;
    for (const key in cssJsonData) {
      // @ts-ignore
      styleData[toHump(key)] = cssJsonData[key];
    }
  } catch (e: any) {
    console.error(e.message);
  }

  return styleData;
}

function CssEditor ({popView, options, value, selector, onChange: onPropsChange, getDefaultOptions}: any) {
  const [cssValue, setCssValue] = useState(getDefaultValue({value, selector}))
  const editorRef = useRef<MonacoEditor>(null)
  const defaultOptions = useMemo(() => getDefaultOptions?.('stylenew') ?? {}, []);
  const [context] = useState({value: cssValue})

  const onMounted = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  const onChange = useCallback((value) => {
    setCssValue(value);

    context.value = value
  }, [])

  const onBlur = useCallback(() => {
    const newStyleData = parseToStyleData(context.value, selector);
    onPropsChange(newStyleData)
  }, [])

  const onFullscreen = useCallback(() => {
    popView(
      CSS_EDITOR_TITLE,
      () => {
        return <div className={css.modal}>{monaco}</div>;
      },
      { 
        onClose: () => {
          // const val = editorRef.current?.getValue();
        }
      }
    )
  }, [cssValue])

  const monaco = useMemo(() => {
    return (
      <MonacoEditor
        height='100%'
        onMounted={onMounted}
        value={cssValue}
        onChange={onChange}
        CDN={defaultOptions.CDN}
        onBlur={onBlur}
        language='css'
      />
    )
  }, [cssValue])

  return (
    <div className={css.codeWrap}>
      <div className={css.inlineWrap}>
        {/* <div className={css.header}>
          <span className={css.title}>{'CSS样式编辑'}</span>
          <div data-mybricks-tip='放大编辑' className={css.plus} onClick={onFullscreen}>
            <FullscreenOutlined />
          </div>
        </div> */}
        <div className={css.body}>
          <div data-mybricks-tip='放大' className={css.plus} onClick={onFullscreen}>
            <FullscreenOutlined />
          </div>
          {monaco}
        </div>
      </div>
    </div>
  )
}

function getDefaultConfiguration2 ({value, options}: GetDefaultConfigurationProps) {
  let finalOpen = false
  let finalSelector

  if (!options) {

  } else if (Array.isArray(options)) {

  } else {
    const { plugins, selector, targetDom, defaultOpen = false } = options
    finalSelector = selector
    finalOpen = defaultOpen
  }

  return {
    finalOpen,
    finalSelector
  } as {
    finalOpen: boolean,
    finalSelector: string
  }
}

/**
 * 获取默认的配置项和样式
 */
function getDefaultConfiguration ({value, options}: GetDefaultConfigurationProps) {
  let finalOpen = false
  let finalOptions
  let defaultValue: CSSProperties = {}
  let finalSelector
  const setValue = deepCopy(value.get() || {})
  let getDefaultValue = true

  if (!options) {
    // 没有options，普通编辑器配置使用，直接使用默认的配置，展示全部
    finalOptions = DEFAULT_OPTIONS
  } else if (Array.isArray(options)) {
    // options是一个数组，直接使用
    finalOptions = options
  } else {
    const { plugins, selector, targetDom, defaultOpen = false } = options
    finalSelector = selector
    finalOpen = defaultOpen
    // 这里还要再处理一下 
    finalOptions = plugins || DEFAULT_OPTIONS
    if (targetDom) {
      getDefaultValue = false
      const styleValues = getStyleValues(targetDom, Array.isArray(selector) ? selector[0] : selector)

      finalOptions.forEach((option) => {
        let type, config

        if (typeof option === 'string') {
          type = option.toLowerCase()
          config = {}
        } else {
          type = option.type.toLowerCase()
          config = option.config || {}
        }

        // @ts-ignore
        if (DEFAULT_OPTIONS.includes(type)) {
          // @ts-ignore TODO: 类型补全
          Object.assign(defaultValue, getDefaultValueFunctionMap[type](styleValues, config))
        }
      })
    }
  }

  if (getDefaultValue) {
    finalOptions.forEach((option) => {
      let type, config

      if (typeof option === 'string') {
        type = option.toLowerCase()
        config = {}
      } else {
        type = option.type.toLowerCase()
        config = option.config || {}
      }

      // @ts-ignore
      if (DEFAULT_OPTIONS.includes(type)) {
        // @ts-ignore TODO: 类型补全
        Object.assign(defaultValue, getDefaultValueFunctionMap2[type]())
      }
    })
  }

  return {
    options: finalOptions,
    defaultValue: Object.assign(defaultValue, setValue),
    setValue,
    finalOpen,
    finalSelector
  } as {
    options: Options,
    defaultValue: CSSProperties,
    setValue: CSSProperties & Record<string, any>,
    finalOpen: boolean,
    finalSelector: string
  }
}

const getDefaultValueFunctionMap = {
  font(values: CSSProperties, config: any) {
    return {
      color: values.color,
      fontSize: values.fontSize,
      textAlign: values.textAlign,
      fontWeight: values.fontWeight,
      fontFamily: values.fontFamily,
      lineHeight: values.lineHeight,
      letterSpacing: values.letterSpacing,
      whiteSpace: values.whiteSpace
    }
  },
  border(values: CSSProperties, config: any) {
    return {
      borderTopColor: values.borderTopColor,
      borderBottomColor: values.borderBottomColor,
      borderRightColor: values.borderRightColor,
      borderLeftColor: values.borderLeftColor,
      borderTopLeftRadius: values.borderTopLeftRadius,
      borderTopRightRadius: values.borderTopRightRadius,
      borderBottomRightRadius: values.borderBottomRightRadius,
      borderBottomLeftRadius: values.borderBottomLeftRadius,
      borderTopStyle: values.borderTopStyle,
      borderBottomStyle: values.borderBottomStyle,
      borderRightStyle: values.borderRightStyle,
      borderLeftStyle: values.borderLeftStyle,
      borderTopWidth: values.borderTopWidth,
      borderBottomWidth: values.borderBottomWidth,
      borderLeftWidth: values.borderLeftWidth,
      borderRightWidth: values.borderRightWidth
    }
  },
  background(values: CSSProperties, config: any) {
    return {
      backgroundColor: values.backgroundColor,
      backgroundImage: values.backgroundImage,
      backgroundRepeat: values.backgroundRepeat,
      backgroundPosition: values.backgroundPosition,
      backgroundSize: values.backgroundSize
    }
  },
  padding(values: CSSProperties, config: any) {
    return {
      paddingTop: values.paddingTop,
      paddingRight: values.paddingRight,
      paddingBottom: values.paddingBottom,
      paddingLeft: values.paddingLeft
    }
  },
  margin(values: CSSProperties, config: any) {
    return {
      marginTop: values.marginTop,
      marginRight: values.marginRight,
      marginBottom: values.marginBottom,
      marginLeft: values.marginLeft
    }
  },
  size(values: CSSProperties, config: any) {
    return {
      width: values.width,
      height: values.height,
      maxWidth: values.maxWidth,
      maxHeight: values.maxHeight,
      minWidth: values.minWidth,
      minHeight: values.minHeight
    }
  },
  cursor(values: CSSProperties, config: any) {
    return {
      cursor: values.cursor
    }
  },
  boxshadow(values: CSSProperties, config: any) {
    return {
      boxShadow: values.boxShadow
    }
  },
  overflow(values: CSSProperties, config: any) {
    return {
      overflowX: values.overflowX,
      overflowY: values.overflowY
    }
  },
  opacity(values: CSSProperties, config: any) {
    return {
      opacity: values.opacity
    }
  }
}

const getDefaultValueFunctionMap2 = {
  font() {
    return {
      color: 'inherit',
      fontSize: 'inherit',
      textAlign: 'start',
      fontWeight: 'inherit',
      fontFamily: 'inherit',
      lineHeight: 'inherit',
      letterSpacing: 'inherit',
      whiteSpace: 'normal'
    }
  },
  border() {
    return {
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderRightColor: 'transparent',
      borderLeftColor: 'transparent',
      borderTopLeftRadius: '0px',
      borderTopRightRadius: '0px',
      borderBottomRightRadius: '0px',
      borderBottomLeftRadius: '0px',
      borderTopStyle: 'none',
      borderBottomStyle: 'none',
      borderRightStyle: 'none',
      borderLeftStyle: 'none',
      borderTopWidth: '0px',
      borderBottomWidth: '0px',
      borderLeftWidth: '0px',
      borderRightWidth: '0px'
    }
  },
  background() {
    return {
      backgroundColor: 'transparent',
      backgroundImage: 'none',
      backgroundRepeat: 'repeat',
      backgroundPosition: 'left top',
      backgroundSize: 'cover'
    }
  },
  padding() {
    return {
      paddingTop: '0px',
      paddingRight: '0px',
      paddingBottom: '0px',
      paddingLeft: '0px'
    }
  },
  margin() {
    return {
      marginTop: '0px',
      marginRight: '0px',
      marginBottom: '0px',
      marginLeft: '0px'
    }
  },
  size() {
    return {
      width: 'auto',
      height: 'auto',
      maxWidth: 'auto',
      maxHeight: 'auto',
      minWidth: 'auto',
      minHeight: 'auto',
    }
  },
  cursor() {
    return {
      cursor: 'inherit'
    }
  },
  boxshadow() {
    return {
      boxShadow: ''
    }
  },
  overflow() {
    return {
      overflowX: 'visible',
      overflowY: 'visible'
    }
  },
  opacity() {
    return {
      opacity: 1
    }
  }
}

function getStyleValues (element: HTMLElement, selector: string) {
  const classListValue = element.classList.value
  // const finalRules = getStyleRules(element, classListValue.indexOf(selector) !== -1 ? null : selector).map((finalRule: any) => {
  //   finalRule.tempCompare = calculate(finalRule.selectorText)
  //   return finalRule
  // }).sort((a, b) => {
  //   return compare(a.tempCompare, b.tempCompare)
  // })
  const finalRules = getStyleRules(element, classListValue.indexOf(selector) !== -1 ? null : selector).filter((finalRule: any) => {
    let tempCompare
    try {
      tempCompare = calculate(finalRule.selectorText)
    } catch {}

    if (tempCompare) {
      finalRule.tempCompare = tempCompare
      return true
    }

    return false
  }).sort((a, b) => {
    // @ts-ignore
    return compare(a.tempCompare, b.tempCompare)
  })
  const computedValues = window.getComputedStyle(element)
  const values = getValues(finalRules, computedValues)

  return values
}

function getValues (rules: CSSStyleRule[], computedValues: CSSStyleDeclaration) {
  // TODO: 先一个个来吧，后面改一下
  /** font */
  let color // 继承属性
  let fontSize // 继承属性
  let textAlign // 继承属性
  let fontWeight // 继承属性
  let lineHeight // 继承属性
  let fontFamily // 继承属性
  let letterSpacing // 继承属性
  let whiteSpace // 继承属性
  /** font */

  /** padding */
  let paddingTop // 非继承属性
  let paddingRight // 非继承属性
  let paddingBottom // 非继承属性
  let paddingLeft // 非继承属性
  /** padding */

  /** margin */
  let marginTop // 非继承属性
  let marginRight // 非继承属性
  let marginBottom // 非继承属性
  let marginLeft // 非继承属性
  /** margin */

  /** background */
  let backgroundColor // 非继承属性
  let backgroundImage // 非继承属性
  let backgroundRepeat // 非继承属性
  let backgroundPosition // 非继承属性
  let backgroundSize // 非继承属性
  /** background */

  /** border */
  let borderTopColor // 非继承属性
  let borderRightColor // 非继承属性
  let borderBottomColor // 非继承属性
  let borderLeftColor // 非继承属性
  let borderTopLeftRadius // 非继承属性
  let borderTopRightRadius // 非继承属性
  let borderBottomRightRadius // 非继承属性
  let borderBottomLeftRadius // 非继承属性
  let borderTopStyle // 非继承属性
  let borderRightStyle // 非继承属性
  let borderBottomStyle // 非继承属性
  let borderLeftStyle // 非继承属性
  let borderTopWidth // 非继承属性
  let borderBottomWidth // 非继承属性
  let borderLeftWidth // 非继承属性
  let borderRightWidth // 非继承属性
  /** border */

  /** size */
  let width // 非继承属性
  let height // 非继承属性
  let maxWidth
  let maxHeight
  let minWidth
  let minHeight
  /** size */

  /** cursor */
  let cursor // 非继承属性
  /** cursor */

  /** boxshadow */
  let boxShadow // 非继承属性
  /** boxshadow */

  /** overflow */
  let overflowX // 非继承属性
  let overflowY // 非继承属性
  /** overflow */

  /** opacity */
  let opacity // 非继承属性
  /** opacity */

  rules.forEach((rule) => {
    const { style } = rule

    /** font */
    const {
      color: styleColor,
      fontSize: styleFontSize,
      textAlign: styleTextAlign,
      fontWeight: styleFontWeight,
      lineHeight: styleLineHeight,
      fontFamily: styleFontFamily,
      letterSpacing: styleLetterSpacing,
      whiteSpace: styleWhiteSpace
    } = style
    if (styleColor) {
      color = styleColor
    }
    if (styleFontSize) {
      fontSize = styleFontSize
    }
    if (styleTextAlign) {
      textAlign = styleTextAlign
    }
    if (styleFontWeight) {
      fontWeight = styleFontWeight
    }
    if (styleLineHeight) {
      lineHeight = styleLineHeight
    }
    if (styleFontFamily) {
      fontFamily = styleFontFamily
    }
    if (styleLetterSpacing) {
      letterSpacing = styleLetterSpacing
    }
    if (styleWhiteSpace) {
      whiteSpace = styleWhiteSpace
    }
    /** font */

    /** padding */
    const {
      paddingTop: stylePaddingTop,
      paddingRight: stylePaddingRight,
      paddingBottom: stylePaddingBottom,
      paddingLeft: stylePaddingLeft
    } = style
    if (stylePaddingTop) {
      paddingTop = stylePaddingTop
    }
    if (stylePaddingRight) {
      paddingRight = stylePaddingRight
    }
    if (stylePaddingBottom) {
      paddingBottom = stylePaddingBottom
    }
    if (stylePaddingLeft) {
      paddingLeft = stylePaddingLeft
    }
    /** padding */

    /** margin */
    const {
      marginTop: styleMarginTop,
      marginRight: styleMarginRight,
      marginBottom: styleMarginBottom,
      marginLeft: styleMarginLeft
    } = style
    if (styleMarginTop) {
      marginTop = styleMarginTop
    }
    if (styleMarginRight) {
      marginRight = styleMarginRight
    }
    if (styleMarginBottom) {
      marginBottom = styleMarginBottom
    }
    if (styleMarginLeft) {
      marginLeft = styleMarginLeft
    }
    /** margin */

    /** background */
    const {
      backgroundColor: styleBackgroundColor,
      backgroundImage: styleBackgroundImage,
      backgroundRepeat: styleBackgroundRepeat,
      backgroundPosition: styleBackgroundPosition,
      backgroundSize: styleBackgroundSize
    } = style
    if (styleBackgroundColor) {
      backgroundColor = styleBackgroundColor
    }
    if (styleBackgroundImage) {
      backgroundImage = styleBackgroundImage
    }
    if (styleBackgroundRepeat) {
      backgroundRepeat = styleBackgroundRepeat
    }
    if (styleBackgroundPosition) {
      backgroundPosition = styleBackgroundPosition
    }
    if (styleBackgroundSize) {
      backgroundSize = styleBackgroundSize
    }
    /** background */

    /** border */
    const {
      borderTopColor: styleBorderTopColor,
      borderRightColor: styleBorderRightColor,
      borderBottomColor: styleBorderBottomColor,
      borderLeftColor: styleBorderLeftColor,
      borderTopLeftRadius: styleBorderTopLeftRadius,
      borderTopRightRadius: styleBorderTopRightRadius,
      borderBottomRightRadius: styleBorderBottomRightRadius,
      borderBottomLeftRadius: styleBorderBottomLeftRadius,
      borderTopStyle: styleBorderTopStyle,
      borderRightStyle: styleBorderRightStyle,
      borderBottomStyle: styleBorderBottomStyle,
      borderLeftStyle: styleBorderLeftStyle,
      borderTopWidth: styleBorderTopWidth,
      borderBottomWidth: styleBorderBottomWidth,
      borderLeftWidth: styleBorderLeftWidth,
      borderRightWidth: styleBorderRightWidth
    } = style
    if (styleBorderTopColor) {
      borderTopColor = styleBorderTopColor
    }
    if (styleBorderRightColor) {
      borderRightColor = styleBorderRightColor
    }
    if (styleBorderBottomColor) {
      borderBottomColor = styleBorderBottomColor
    }
    if (styleBorderLeftColor) {
      borderLeftColor = styleBorderLeftColor
    }
    if (styleBorderTopLeftRadius) {
      borderTopLeftRadius = styleBorderTopLeftRadius
    }
    if (styleBorderTopRightRadius) {
      borderTopRightRadius = styleBorderTopRightRadius
    }
    if (styleBorderBottomRightRadius) {
      borderBottomRightRadius = styleBorderBottomRightRadius
    }
    if (styleBorderBottomLeftRadius) {
      borderBottomLeftRadius = styleBorderBottomLeftRadius
    }
    if (styleBorderTopStyle) {
      borderTopStyle = styleBorderTopStyle
    }
    if (styleBorderRightStyle) {
      borderRightStyle = styleBorderRightStyle
    }
    if (styleBorderBottomStyle) {
      borderBottomStyle = styleBorderBottomStyle
    }
    if (styleBorderLeftStyle) {
      borderLeftStyle = styleBorderLeftStyle
    }
    if (styleBorderTopWidth) {
      borderTopWidth = styleBorderTopWidth
    }
    if (styleBorderBottomWidth) {
      borderBottomWidth = styleBorderBottomWidth
    }
    if (styleBorderLeftWidth) {
      borderLeftWidth = styleBorderLeftWidth
    }
    if (styleBorderRightWidth) {
      borderRightWidth = styleBorderRightWidth
    }
    /** border */

    /** size */
    const {
      width: styleWidth,
      height: styleHeight,
      maxWidth: styleMaxWidth,
      maxHeight: styleMaxHeight,
      minWidth: styleMinWidth,
      minHeight: styleMinHeight,
    } = style
    if (styleWidth) {
      width = styleWidth
    }
    if (styleHeight) {
      height = styleHeight
    }
    if (styleMaxWidth) {
      maxWidth = styleMaxWidth
    }
    if (styleMaxHeight) {
      maxHeight = styleMaxHeight
    }
    if (styleMinWidth) {
      minWidth = styleMinWidth
    }
    if (styleMinHeight) {
      minHeight = styleMinHeight
    }
    /** size */

    /** cursor */
    const {
      cursor: styleCursor
    } = style
    if (styleCursor) {
      cursor = styleCursor
    } 
    /** cursor */

    /** boxShadow TODO:  */
    // const {
    //   boxShadow: styleBoxShadow
    // } = style
    // if (styleBoxShadow) {
    //     boxShadow = styleBoxShadow
    //   }
    /** boxShadow */

    /** overflow */
    const {
      overflowX: styleOverflowX,
      overflowY: styleOverflowY
    } = style
    if (styleOverflowX) {
      overflowX = styleOverflowX
    }
    if (styleOverflowY) {
      overflowY = styleOverflowY
    }
    /** overflow */

    /** opacity */
    const { opacity: styleOpacity } = style
    if (styleOpacity) {
      opacity = styleOpacity
    }
    /** opacity */
  })

  /** font */
  if (!color || !colorUtil.get(color)) {
    color = computedValues.color
  }
  if (!fontSize) {
    fontSize = computedValues.fontSize
  }
  if (!textAlign) {
    textAlign = computedValues.textAlign
  }
  if (!fontWeight) {
    fontWeight = computedValues.fontWeight
  }
  if (!lineHeight) {
    lineHeight = computedValues.lineHeight
  }
  if (!fontFamily) {
    // fontFamily = computedValues.fontFamily
    fontFamily = 'inherit'
  }
  if (!letterSpacing) {
    letterSpacing = computedValues.letterSpacing
  }
  if (!whiteSpace) {
    whiteSpace = computedValues.whiteSpace
  }
  /** font */

  /** padding */
  if (!paddingTop) {
    paddingTop = computedValues.paddingTop
  }
  if (!paddingRight) {
    paddingRight = computedValues.paddingRight
  }
  if (!paddingBottom) {
    paddingBottom = computedValues.paddingBottom
  }
  if (!paddingLeft) {
    paddingLeft = computedValues.paddingLeft
  }
  /** padding */

  /** margin */
  if (!marginTop) {
    marginTop = computedValues.marginTop
  }
  if (!marginRight) {
    marginRight = computedValues.marginRight
  }
  if (!marginBottom) {
    marginBottom = computedValues.marginBottom
  }
  if (!marginLeft) {
    marginLeft = computedValues.marginLeft
  }
  /** margin */


  /** background */
  if (!backgroundColor || !colorUtil.get(backgroundColor)) {
    backgroundColor = computedValues.backgroundColor
  }
  if (!backgroundImage) {
    // backgroundImage = computedValues.backgroundImage
    backgroundImage = 'none'
  }
  if (!backgroundRepeat) {
    backgroundRepeat = computedValues.backgroundRepeat
  }
  if (!backgroundPosition) {
    // backgroundPosition = computedValues.backgroundPosition
    backgroundPosition = 'left top'
  }
  if (!backgroundSize) {
    backgroundSize = computedValues.backgroundSize
  }
  /** background */

  /** border */
  if (!borderTopColor || !colorUtil.get(borderTopColor)) {
    borderTopColor = computedValues.borderTopColor // 默认使用当前元素color,否则为浏览器默认颜色
  }
  if (!borderRightColor || !colorUtil.get(borderRightColor)) {
    borderRightColor = computedValues.borderRightColor
  }
  if (!borderBottomColor || !colorUtil.get(borderBottomColor)) {
    borderBottomColor = computedValues.borderBottomColor
  }
  if (!borderLeftColor || !colorUtil.get(borderLeftColor)) {
    borderLeftColor = computedValues.borderLeftColor
  }
  if (!borderTopLeftRadius) {
    borderTopLeftRadius = computedValues.borderTopLeftRadius
  }
  if (!borderTopRightRadius) {
    borderTopRightRadius = computedValues.borderTopRightRadius
  }
  if (!borderBottomRightRadius) {
    borderBottomRightRadius = computedValues.borderBottomRightRadius
  }
  if (!borderBottomLeftRadius) {
    borderBottomLeftRadius = computedValues.borderBottomLeftRadius
  }
  if (!borderTopStyle) {
    borderTopStyle = computedValues.borderTopStyle
  }
  if (!borderRightStyle) {
    borderRightStyle = computedValues.borderRightStyle
  }
  if (!borderBottomStyle) {
    borderBottomStyle = computedValues.borderBottomStyle
  }
  if (!borderLeftStyle) {
    borderLeftStyle = computedValues.borderLeftStyle
  }
  if (!borderTopWidth || borderTopWidth === 'initial') {
    borderTopWidth = computedValues.borderTopWidth
  }
  if (!borderBottomWidth || borderBottomWidth === 'initial') {
    borderBottomWidth = computedValues.borderBottomWidth
  }
  if (!borderLeftWidth || borderLeftWidth === 'initial') {
    borderLeftWidth = computedValues.borderLeftWidth
  }
  if (!borderRightWidth || borderRightWidth === 'initial') {
    borderRightWidth = computedValues.borderRightWidth
  }
  /** border */

  /** size */
  if (!width) {
    width = 'auto'
  }
  if (!height) {
    height = 'auto'
  }
  if (!maxWidth) {
    maxWidth = 'auto'
  }
  if (!maxHeight) {
    maxHeight = 'auto'
  }
  if (!minWidth) {
    minWidth = 'auto'
  }
  if (!minHeight) {
    minHeight = 'auto'
  }
  /** size */

  /** cursor */
  if (!cursor) {
    cursor = 'inherit'
  }
  /** cursor */

  /** boxshadow */
  if (!boxShadow) {
    boxShadow = computedValues.boxShadow;
  }
  /** boxshadow */

  /** overflow */
  if (!overflowX) {
    overflowX = computedValues.overflowX
  }
  if (!overflowY) {
    overflowY = computedValues.overflowY
  }
  /** overflow */

  /** opacity */
  if (!opacity) {
    opacity = 1
  }
  /** opacity */

  return getRealValue({
    color,
    fontSize,
    textAlign,
    fontWeight,
    lineHeight,
    fontFamily,
    letterSpacing,
    whiteSpace,

    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,

    marginTop,
    marginRight,
    marginBottom,
    marginLeft,

    backgroundColor,
    backgroundImage,
    backgroundRepeat,
    backgroundPosition,
    backgroundSize,

    borderTopColor,
    borderBottomColor,
    borderLeftColor,
    borderRightColor,
    borderTopLeftRadius,
    borderTopRightRadius,
    borderBottomRightRadius,
    borderBottomLeftRadius,
    borderTopStyle,
    borderRightStyle,
    borderBottomStyle,
    borderLeftStyle,
    borderTopWidth,
    borderBottomWidth,
    borderLeftWidth,
    borderRightWidth,

    width,
    height,
    maxWidth,
    maxHeight,
    minWidth,
    minHeight,

    cursor,

    boxShadow,

    overflowX,
    overflowY,

    opacity
  }, computedValues)
}

function getStyleRules (element: HTMLElement, selector: string | null) {
  const finalRules = []
  const root = document.getElementById('_mybricks-geo-webview_')?.shadowRoot || document

  for (let i = 0; i < root.styleSheets.length; i++) {
    try {
      const sheet = root.styleSheets[i]
      const rules = sheet.cssRules ? sheet.cssRules : sheet.rules
  
      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j]
        if (rule instanceof CSSStyleRule) {
          const { selectorText } = rule
          if (element.matches(selectorText) || selector === selectorText) {
            finalRules.push(rule)
          }
        }
      }
    } catch {}
  }

  return finalRules
}

// TODO: 之后的主题配置，按理说所有编辑器均需要做好兼容
function getRealValue(style: any, computedValues: CSSStyleDeclaration) {
  const finalStyle: any = {}

  Object.keys(style).forEach((key) => {
    const value = style[key]
    if (typeof value === 'string') {
      // @ts-ignore
      finalStyle[key] = value.startsWith('var') ? computedValues[key] : value
    } else {
      finalStyle[key] = value
    }
  })

  return finalStyle
}
