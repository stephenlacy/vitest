import type { BrowserPage, UserEventClickOptions, UserEventDragAndDropOptions, UserEventHoverOptions, UserEventSelectOptions } from '@vitest/browser/context'
import { page, server } from '@vitest/browser/context'
import {
  getByAltTextSelector,
  getByLabelSelector,
  getByPlaceholderSelector,
  getByRoleSelector,
  getByTestIdSelector,
  getByTextSelector,
  getByTitleSelector,
} from 'ivya'
import { getBrowserState } from '../../utils'
import { getElementError } from '../public-utils'
import { convertElementToCssSelector, getIframeScale } from '../utils'
import { Locator, selectorEngine } from './index'

page.extend({
  getByLabelText(text, options) {
    return new WebdriverIOLocator(getByLabelSelector(text, options))
  },
  getByRole(role, options) {
    return new WebdriverIOLocator(getByRoleSelector(role, options))
  },
  getByTestId(testId) {
    return new WebdriverIOLocator(getByTestIdSelector(server.config.browser.locators.testIdAttribute, testId))
  },
  getByAltText(text, options) {
    return new WebdriverIOLocator(getByAltTextSelector(text, options))
  },
  getByPlaceholder(text, options) {
    return new WebdriverIOLocator(getByPlaceholderSelector(text, options))
  },
  getByText(text, options) {
    return new WebdriverIOLocator(getByTextSelector(text, options))
  },
  getByTitle(title, options) {
    return new WebdriverIOLocator(getByTitleSelector(title, options))
  },

  _createLocator(selector: string) {
    return new WebdriverIOLocator(selector)
  },
  elementLocator(element: Element) {
    return new WebdriverIOLocator(selectorEngine.generateSelectorSimple(element))
  },

  // iframe support
  createFramePage(frameElement: Element | Locator) {
    const iframeElement = frameElement instanceof Element ? frameElement : frameElement.element()
    if (!(iframeElement instanceof HTMLIFrameElement)) {
      throw new TypeError('Expected frameElement to be an iframe element')
    }

    const iframeDocument = iframeElement.contentWindow?.document || iframeElement.contentDocument
    if (!iframeDocument) {
      throw new Error('Could not access iframe content document')
    }

    function createIframeLocator(selector: string): Locator {
      const baseLocator = new WebdriverIOLocator(selector)

      const locator = Object.create(baseLocator) as Locator

      locator.query = function (): Element | null {
        const parsedSelector = selectorEngine.parseSelector(selector)
        if (iframeDocument) {
          return selectorEngine.querySelector(parsedSelector, iframeDocument.documentElement, true)
        }
        return null
      }

      locator.elements = function (): Element[] {
        const parsedSelector = selectorEngine.parseSelector(selector)
        if (iframeDocument) {
          return selectorEngine.querySelectorAll(parsedSelector, iframeDocument.documentElement)
        }
        return []
      }

      return locator
    }

    const framePage = Object.create(page) as BrowserPage

    framePage._createLocator = createIframeLocator
    framePage.getByRole = (role, options) =>
      createIframeLocator(getByRoleSelector(role, options))
    framePage.getByLabelText = (text, options) =>
      createIframeLocator(getByLabelSelector(text, options))
    framePage.getByTestId = testId =>
      createIframeLocator(getByTestIdSelector(server.config.browser.locators.testIdAttribute, testId))
    framePage.getByAltText = (text, options) =>
      createIframeLocator(getByAltTextSelector(text, options))
    framePage.getByPlaceholder = (text, options) =>
      createIframeLocator(getByPlaceholderSelector(text, options))
    framePage.getByText = (text, options) =>
      createIframeLocator(getByTextSelector(text, options))
    framePage.getByTitle = (title, options) =>
      createIframeLocator(getByTitleSelector(title, options))

    return framePage
  },
})

class WebdriverIOLocator extends Locator {
  constructor(protected _pwSelector: string, protected _container?: Element) {
    super()
  }

  override get selector(): string {
    const selectors = this.elements().map(element => convertElementToCssSelector(element))
    if (!selectors.length) {
      throw getElementError(this._pwSelector, this._container || document.body)
    }
    return selectors.join(', ')
  }

  public override click(options?: UserEventClickOptions): Promise<void> {
    return super.click(processClickOptions(options))
  }

  public override dblClick(options?: UserEventClickOptions): Promise<void> {
    return super.dblClick(processClickOptions(options))
  }

  public override tripleClick(options?: UserEventClickOptions): Promise<void> {
    return super.tripleClick(processClickOptions(options))
  }

  public selectOptions(
    value: HTMLElement | HTMLElement[] | Locator | Locator[] | string | string[],
    options?: UserEventSelectOptions,
  ): Promise<void> {
    const values = getWebdriverioSelectOptions(this.element(), value)
    return this.triggerCommand('__vitest_selectOptions', this.selector, values, options)
  }

  public override hover(options?: UserEventHoverOptions): Promise<void> {
    return super.hover(processHoverOptions(options))
  }

  public override dropTo(target: Locator, options?: UserEventDragAndDropOptions): Promise<void> {
    return super.dropTo(target, processDragAndDropOptions(options))
  }

  protected locator(selector: string) {
    return new WebdriverIOLocator(`${this._pwSelector} >> ${selector}`, this._container)
  }

  protected elementLocator(element: Element) {
    return new WebdriverIOLocator(selectorEngine.generateSelectorSimple(element), element)
  }
}

function getWebdriverioSelectOptions(element: Element, value: string | string[] | HTMLElement[] | HTMLElement | Locator | Locator[]) {
  const options = [...element.querySelectorAll('option')] as HTMLOptionElement[]

  const arrayValues = Array.isArray(value) ? value : [value]

  if (!arrayValues.length) {
    return []
  }

  if (arrayValues.length > 1) {
    throw new Error('Provider "webdriverio" doesn\'t support selecting multiple values at once')
  }

  const optionValue = arrayValues[0]

  if (typeof optionValue !== 'string') {
    const element = ('element' in optionValue ? optionValue.element() : optionValue) as HTMLOptionElement
    const index = options.indexOf(element)
    if (index === -1) {
      throw new Error(`The element ${selectorEngine.previewNode(element)} was not found in the "select" options.`)
    }

    return [{ index }]
  }

  const valueIndex = options.findIndex(option => option.value === optionValue)
  if (valueIndex !== -1) {
    return [{ index: valueIndex }]
  }

  const labelIndex = options.findIndex(option =>
    option.textContent?.trim() === optionValue || option.ariaLabel === optionValue,
  )

  if (labelIndex === -1) {
    throw new Error(`The option "${optionValue}" was not found in the "select" options.`)
  }

  return [{ index: labelIndex }]
}

function processClickOptions(options_?: UserEventClickOptions) {
  // only ui scales the iframe, so we need to adjust the position
  if (!options_ || !getBrowserState().config.browser.ui) {
    return options_
  }
  const options = options_ as import('webdriverio').ClickOptions
  if (options.x != null || options.y != null) {
    const cache = {}
    if (options.x != null) {
      options.x = scaleCoordinate(options.x, cache)
    }
    if (options.y != null) {
      options.y = scaleCoordinate(options.y, cache)
    }
  }
  return options_
}

function processHoverOptions(options_?: UserEventHoverOptions) {
  // only ui scales the iframe, so we need to adjust the position
  if (!options_ || !getBrowserState().config.browser.ui) {
    return options_
  }
  const options = options_ as import('webdriverio').MoveToOptions
  const cache = {}
  if (options.xOffset != null) {
    options.xOffset = scaleCoordinate(options.xOffset, cache)
  }
  if (options.yOffset != null) {
    options.yOffset = scaleCoordinate(options.yOffset, cache)
  }
  return options_
}

function processDragAndDropOptions(options_?: UserEventDragAndDropOptions) {
  // only ui scales the iframe, so we need to adjust the position
  if (!options_ || !getBrowserState().config.browser.ui) {
    return options_
  }
  const cache = {}
  const options = options_ as import('webdriverio').DragAndDropOptions & {
    targetX?: number
    targetY?: number
    sourceX?: number
    sourceY?: number
  }
  if (options.sourceX != null) {
    options.sourceX = scaleCoordinate(options.sourceX, cache)
  }
  if (options.sourceY != null) {
    options.sourceY = scaleCoordinate(options.sourceY, cache)
  }
  if (options.targetX != null) {
    options.targetX = scaleCoordinate(options.targetX, cache)
  }
  if (options.targetY != null) {
    options.targetY = scaleCoordinate(options.targetY, cache)
  }
  return options_
}

function scaleCoordinate(coordinate: number, cache: any) {
  return Math.round(coordinate * getCachedScale(cache))
}

function getCachedScale(cache: { scale: number | undefined }) {
  return cache.scale ??= getIframeScale()
}
