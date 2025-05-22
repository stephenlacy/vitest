import type { BrowserPage } from '@vitest/browser/context'
import { page, server, userEvent } from '@vitest/browser/context'
import {
  getByAltTextSelector,
  getByLabelSelector,
  getByPlaceholderSelector,
  getByRoleSelector,
  getByTestIdSelector,
  getByTextSelector,
  getByTitleSelector,
} from 'ivya'
import { getElementError } from '../public-utils'
import { convertElementToCssSelector } from '../utils'
import { Locator, selectorEngine } from './index'

page.extend({
  getByLabelText(text, options) {
    return new PreviewLocator(getByLabelSelector(text, options))
  },
  getByRole(role, options) {
    return new PreviewLocator(getByRoleSelector(role, options))
  },
  getByTestId(testId) {
    return new PreviewLocator(getByTestIdSelector(server.config.browser.locators.testIdAttribute, testId))
  },
  getByAltText(text, options) {
    return new PreviewLocator(getByAltTextSelector(text, options))
  },
  getByPlaceholder(text, options) {
    return new PreviewLocator(getByPlaceholderSelector(text, options))
  },
  getByText(text, options) {
    return new PreviewLocator(getByTextSelector(text, options))
  },
  getByTitle(title, options) {
    return new PreviewLocator(getByTitleSelector(title, options))
  },

  _createLocator(selector: string) {
    return new PreviewLocator(selector)
  },
  elementLocator(element: Element) {
    return new PreviewLocator(
      selectorEngine.generateSelectorSimple(element),
      element,
    )
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
      const baseLocator = new PreviewLocator(selector)

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

class PreviewLocator extends Locator {
  constructor(protected _pwSelector: string, protected _container?: Element) {
    super()
  }

  override get selector() {
    const selectors = this.elements().map(element => convertElementToCssSelector(element))
    if (!selectors.length) {
      throw getElementError(this._pwSelector, this._container || document.body)
    }
    return selectors.join(', ')
  }

  click(): Promise<void> {
    return userEvent.click(this.element())
  }

  dblClick(): Promise<void> {
    return userEvent.dblClick(this.element())
  }

  tripleClick(): Promise<void> {
    return userEvent.tripleClick(this.element())
  }

  hover(): Promise<void> {
    return userEvent.hover(this.element())
  }

  unhover(): Promise<void> {
    return userEvent.unhover(this.element())
  }

  async fill(text: string): Promise<void> {
    return userEvent.fill(this.element(), text)
  }

  async upload(file: string | string[] | File | File[]): Promise<void> {
    return userEvent.upload(this.element(), file)
  }

  selectOptions(options: string | string[] | HTMLElement | HTMLElement[] | Locator | Locator[]): Promise<void> {
    return userEvent.selectOptions(this.element(), options)
  }

  clear(): Promise<void> {
    return userEvent.clear(this.element())
  }

  protected locator(selector: string) {
    return new PreviewLocator(`${this._pwSelector} >> ${selector}`, this._container)
  }

  protected elementLocator(element: Element) {
    return new PreviewLocator(
      selectorEngine.generateSelectorSimple(element),
      element,
    )
  }
}
