import React, {
  useMemo,
  useState,
  useCallback,
  CSSProperties
} from 'react'

import {
  Panel,
  InputNumber,
  PaddingAllOutlined,
  PaddingTopOutlined,
  PaddingLeftOutlined,
  PaddingRightOutlined,
  PaddingBottomOutlined
} from '../../components'
import { allEqual } from '../../utils'
import { useUpdateEffect } from '../../hooks'

import type { ChangeEvent } from '../../type'

import css from './index.less'

interface PaddingProps {
  value: CSSProperties
  onChange: ChangeEvent
  config: {
    [key: string]: any
  }
}

export function Padding ({value, onChange, config}: PaddingProps) {
  const [toggle, setToggle] = useState(getToggleDefaultValue(value))
  const [paddingValue, setPaddingValue] = useState({...value})
  const [splitPaddingIcon, setSplitPaddingIcon] = useState(<PaddingTopOutlined />)

  const handleChange = useCallback((value) => {
    setPaddingValue((val) => {
      return {
        ...val,
        ...value
      }
    })
    onChange(Object.keys(value).map((key) => {
      return {
        key,
        value: value[key]
      }
    }))
  }, [])

  useUpdateEffect(() => {
    if (toggle) {
      handleChange({
        paddingTop: paddingValue.paddingTop,
        paddingRight: paddingValue.paddingTop,
        paddingBottom: paddingValue.paddingTop,
        paddingLeft: paddingValue.paddingTop
      })
    }
  }, [toggle])

  const paddingConfig = useMemo(() => {
    const style = {
      padding: 0,
      fontSize: 10, 
      minWidth: 44,
      maxWidth: 44,
      marginLeft: 4
    }
    if (toggle) {
      return (
        <div className={css.row}>
          <Panel.Content style={{padding: 3}}>
            <Panel.Item className={css.editArea} style={{padding: '0px 4px 0px 8px'}}>
              <div className={css.icon}>
                <PaddingAllOutlined />
              </div>
              <InputNumber
                style={style}
                defaultValue={paddingValue.paddingTop}
                suffix={'px'}
                onChange={(value) => handleChange({
                  paddingTop: value,
                  paddingRight: value,
                  paddingBottom: value,
                  paddingLeft: value,
                })}
              />
            </Panel.Item>
          </Panel.Content>
          <div
            className={css.actionIcon}
            onClick={() => setToggle(false)}
          >
            <PaddingAllOutlined />
          </div>
        </div>
      )
    } else {
      return (
        <div className={css.row}>
          <Panel.Content style={{padding: 3}}>
            <Panel.Item className={css.editArea} style={{padding: '0px 4px 0px 8px'}}>
              <div className={css.icon}>
                {splitPaddingIcon}
              </div>
              <InputNumber
                style={style}
                defaultValue={paddingValue.paddingTop}
                suffix={'px'}
                onFocus={() => setSplitPaddingIcon(<PaddingTopOutlined />)}
                onChange={(value) => handleChange({paddingTop: value})}
              />
              <InputNumber
                style={style}
                defaultValue={paddingValue.paddingRight}
                suffix={'px'}
                onFocus={() => setSplitPaddingIcon(<PaddingRightOutlined />)}
                onChange={(value) => handleChange({paddingRight: value})}
              />
              <InputNumber
                style={style}
                defaultValue={paddingValue.paddingBottom}
                suffix={'px'}
                onFocus={() => setSplitPaddingIcon(<PaddingBottomOutlined />)}
                onChange={(value) => handleChange({paddingBottom: value})}
              />
              <InputNumber
                style={style}
                defaultValue={paddingValue.paddingLeft}
                suffix={'px'}
                onFocus={() => setSplitPaddingIcon(<PaddingLeftOutlined />)}
                onChange={(value) => handleChange({paddingLeft: value})}
              />
            </Panel.Item>
          </Panel.Content>
          <div
            className={css.actionIcon}
            onClick={() => setToggle(true)}
          >
            <PaddingTopOutlined />
          </div>
        </div>
      )
    }
  }, [toggle, splitPaddingIcon])

  return (
    <Panel title='内边距'>
      {paddingConfig}
    </Panel>
  )
}

function getToggleDefaultValue (value: CSSProperties): boolean {
  return allEqual([value.paddingTop, value.paddingRight, value.paddingBottom, value.paddingLeft])
}
