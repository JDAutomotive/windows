import React, {
  useReducer,
  useRef,
  useCallback,
  useLayoutEffect,
  useState,
  useEffect,
} from 'react';
import styled, { keyframes } from 'styled-components';
import useMouse from 'react-use/lib/useMouse';
import ga from 'react-ga';

import { getLocalStorage, setLocalStorage, debouncedFunc } from './utils';
import {
  defaultDesktop,
  defaultScreenSaver,
} from './apps/DisplayProperties/utils';

import {
  ADD_APP,
  DEL_APP,
  FOCUS_APP,
  MINIMIZE_APP,
  TOGGLE_MAXIMIZE_APP,
  FOCUS_ICON,
  SELECT_ICONS,
  FOCUS_DESKTOP,
  START_SELECT,
  END_SELECT,
  CONTEXT_MENU,
  POWER_OFF,
  CANCEL_POWER_OFF,
  DISPLAY_PROPERTIES,
  SCREEN_SAVER_PREVIEW,
} from './constants/actions';
import { FOCUSING, POWER_STATE } from './constants';
import { defaultIconState, defaultAppState, appSettings } from './apps';
import Modal from './Modal';
import Footer from './Footer';
import Windows from './Windows';
import Icons from './Icons';
import ContextMenu from 'components/ContextMenu';
import { contextMenuData } from 'components/ContextMenu/utils';
import BackgroundView from 'components/BackgroundView';

import { DashedBox } from 'components';
import ScreenSaver from 'components/ScreenSavers';

export const Context = React.createContext();

const initState = {
  apps: defaultAppState,
  nextAppID: defaultAppState.length,
  nextZIndex: defaultAppState.length,
  focusing: FOCUSING.WINDOW,
  icons: defaultIconState,
  selecting: false,
  contextMenuPosition: null,
  powerState: POWER_STATE.START,
  displayProperties: {
    desktop: defaultDesktop,
    screenSaver: defaultScreenSaver,
    screenSaverPreview: false,
  },
};
const reducer = (state, action = { type: '' }) => {
  ga.event({
    category: 'XP interaction',
    action: action.type,
  });
  switch (action.type) {
    case ADD_APP:
      const app = state.apps.find(
        _app => _app.component === action.payload.component,
      );
      if (action.payload.multiInstance || !app) {
        return {
          ...state,
          apps: [
            ...state.apps,
            {
              ...action.payload,
              id: state.nextAppID,
              zIndex: state.nextZIndex,
            },
          ],
          nextAppID: state.nextAppID + 1,
          nextZIndex: state.nextZIndex + 1,
          focusing: FOCUSING.WINDOW,
          contextMenuPosition: null,
        };
      }
      const apps = state.apps.map(app =>
        app.component === action.payload.component
          ? { ...app, zIndex: state.nextZIndex, minimized: false }
          : app,
      );
      return {
        ...state,
        apps,
        nextZIndex: state.nextZIndex + 1,
        focusing: FOCUSING.WINDOW,
        contextMenuPosition: null,
      };
    case DEL_APP:
      if (state.focusing !== FOCUSING.WINDOW) return state;
      return {
        ...state,
        apps: state.apps.filter(app => app.id !== action.payload),
        focusing:
          state.apps.length > 1
            ? FOCUSING.WINDOW
            : state.icons.find(icon => icon.isFocus)
            ? FOCUSING.ICON
            : FOCUSING.DESKTOP,
      };
    case FOCUS_APP: {
      const apps = state.apps.map(app =>
        app.id === action.payload
          ? { ...app, zIndex: state.nextZIndex, minimized: false }
          : app,
      );
      return {
        ...state,
        apps,
        nextZIndex: state.nextZIndex + 1,
        focusing: FOCUSING.WINDOW,
      };
    }
    case MINIMIZE_APP: {
      if (state.focusing !== FOCUSING.WINDOW) return state;
      const apps = state.apps.map(app =>
        app.id === action.payload ? { ...app, minimized: true } : app,
      );
      return {
        ...state,
        apps,
        focusing: FOCUSING.WINDOW,
      };
    }
    case TOGGLE_MAXIMIZE_APP: {
      if (state.focusing !== FOCUSING.WINDOW) return state;
      const apps = state.apps.map(app =>
        app.id === action.payload ? { ...app, maximized: !app.maximized } : app,
      );
      return {
        ...state,
        apps,
        focusing: FOCUSING.WINDOW,
      };
    }
    case FOCUS_ICON: {
      const icons = state.icons.map(icon => ({
        ...icon,
        isFocus: icon.id === action.payload,
      }));
      return {
        ...state,
        focusing: FOCUSING.ICON,
        icons,
      };
    }
    case SELECT_ICONS: {
      const icons = state.icons.map(icon => ({
        ...icon,
        isFocus: action.payload.includes(icon.id),
      }));
      return {
        ...state,
        icons,
        focusing: FOCUSING.ICON,
      };
    }
    case FOCUS_DESKTOP:
      return {
        ...state,
        focusing: FOCUSING.DESKTOP,
        icons: state.icons.map(icon => ({
          ...icon,
          isFocus: false,
        })),
      };
    case START_SELECT:
      return {
        ...state,
        focusing: FOCUSING.DESKTOP,
        icons: state.icons.map(icon => ({
          ...icon,
          isFocus: false,
        })),
        selecting: action.payload,
        contextMenuPosition: null,
      };
    case END_SELECT:
      return {
        ...state,
        selecting: null,
      };
    case CONTEXT_MENU:
      return {
        ...state,
        contextMenuPosition: action.payload,
      };
    case POWER_OFF:
      return {
        ...state,
        powerState: action.payload,
      };
    case CANCEL_POWER_OFF:
      return {
        ...state,
        powerState: POWER_STATE.START,
      };
    case DISPLAY_PROPERTIES:
      if (action.payload) setLocalStorage('displayProperties', action.payload);
      return {
        ...state,
        displayProperties: action.payload,
      };
    case SCREEN_SAVER_PREVIEW:
      return {
        ...state,
        displayProperties: {
          ...state.displayProperties,
          screenSaverPreview: action.payload,
        },
      };

    default:
      return state;
  }
};

function WinXP() {
  const [state, dispatch] = useReducer(reducer, initState);

  const [isScreenSaverActive, setIsScreenSaverActive] = useState(false);

  const screenSaverTimeoutid = useRef();

  const screenSaverIdleTimer = useCallback(() => {
    const { wait } = state.displayProperties.screenSaver;
    clearTimeout(screenSaverTimeoutid.current);
    if (state.displayProperties.screenSaver.value !== '(None)') {
      const id = setTimeout(() => {
        setIsScreenSaverActive(true);
        ref.current.focus();
      }, wait * 1000 * 60);
      screenSaverTimeoutid.current = id;
    }
  }, [state.displayProperties.screenSaver]);

  useEffect(() => {
    screenSaverIdleTimer();
    return () => {
      clearTimeout(screenSaverTimeoutid.current);
    };
  }, [screenSaverIdleTimer]);

  useEffect(() => {
    if (state.displayProperties.screenSaverPreview) {
      setIsScreenSaverActive(true);
    }
  }, [state.displayProperties.screenSaverPreview]);

  useLayoutEffect(() => {
    const displayProperties = getLocalStorage('displayProperties');
    if (displayProperties)
      dispatch({
        type: DISPLAY_PROPERTIES,
        payload: displayProperties,
      });
  }, []);

  const ref = useRef(null);
  const mouse = useMouse(ref);
  const focusedAppId = getFocusedAppId();
  const onFocusApp = useCallback(id => {
    dispatch({ type: FOCUS_APP, payload: id });
  }, []);
  const onMaximizeWindow = useCallback(
    id => {
      if (focusedAppId === id) {
        dispatch({ type: TOGGLE_MAXIMIZE_APP, payload: id });
      }
    },
    [focusedAppId],
  );
  const onMinimizeWindow = useCallback(
    id => {
      if (focusedAppId === id) {
        dispatch({ type: MINIMIZE_APP, payload: id });
      }
    },
    [focusedAppId],
  );
  const onCloseApp = useCallback(
    id => {
      if (focusedAppId === id) {
        dispatch({ type: DEL_APP, payload: id });
      }
    },
    [focusedAppId],
  );

  function onMouseDownFooterApp(id) {
    if (focusedAppId === id) {
      dispatch({ type: MINIMIZE_APP, payload: id });
    } else {
      dispatch({ type: FOCUS_APP, payload: id });
    }
  }
  function onMouseDownIcon(id) {
    dispatch({ type: FOCUS_ICON, payload: id });
  }
  function onDoubleClickIcon(component) {
    const appSetting = Object.values(appSettings).find(
      setting => setting.component === component,
    );
    dispatch({ type: ADD_APP, payload: appSetting });
  }
  function getFocusedAppId() {
    if (state.focusing !== FOCUSING.WINDOW) return -1;
    const focusedApp = [...state.apps]
      .sort((a, b) => b.zIndex - a.zIndex)
      .find(app => !app.minimized);
    return focusedApp ? focusedApp.id : -1;
  }
  function onMouseDownFooter() {
    dispatch({ type: FOCUS_DESKTOP });
  }
  function onClickMenuItem(o) {
    if (o === 'Internet')
      dispatch({ type: ADD_APP, payload: appSettings['Internet Explorer'] });
    else if (o === 'Minesweeper')
      dispatch({ type: ADD_APP, payload: appSettings.Minesweeper });
    else if (o === 'My Computer')
      dispatch({ type: ADD_APP, payload: appSettings['My Computer'] });
    else if (o === 'Notepad')
      dispatch({ type: ADD_APP, payload: appSettings.Notepad });
    else if (o === 'Winamp')
      dispatch({ type: ADD_APP, payload: appSettings.Winamp });
    else if (o === 'Paint')
      dispatch({ type: ADD_APP, payload: appSettings.Paint });
    else if (o === 'Log Off')
      dispatch({ type: POWER_OFF, payload: POWER_STATE.LOG_OFF });
    else if (o === 'Turn Off Computer')
      dispatch({ type: POWER_OFF, payload: POWER_STATE.TURN_OFF });
    else
      dispatch({
        type: ADD_APP,
        payload: {
          ...appSettings.Error,
          injectProps: { message: 'C:\\\nApplication not found' },
        },
      });
  }
  function onMouseDownDesktop(e) {
    resetScreenSaver();
    if (e.target === e.currentTarget)
      dispatch({
        type: START_SELECT,
        payload: { x: mouse.docX, y: mouse.docY },
      });
  }
  function onMouseUpDesktop(e) {
    dispatch({ type: END_SELECT });
  }
  function onContextMenu(e) {
    e.preventDefault();
    dispatch({
      type: CONTEXT_MENU,
      payload: { x: mouse.docX, y: mouse.docY },
    });
  }
  function onIconsSelected(iconIds) {
    dispatch({ type: SELECT_ICONS, payload: iconIds });
  }
  function onClickModalButton(text) {
    dispatch({ type: CANCEL_POWER_OFF });
    dispatch({
      type: ADD_APP,
      payload: appSettings.Error,
    });
  }
  function onModalClose() {
    dispatch({ type: CANCEL_POWER_OFF });
  }

  const resetScreenSaver = () => {
    dispatch({
      type: SCREEN_SAVER_PREVIEW,
      payload: false,
    });
    setIsScreenSaverActive(false);
    debouncedFunc(screenSaverIdleTimer);
  };

  return (
    <Container
      ref={ref}
      onMouseMove={resetScreenSaver}
      onKeyDown={resetScreenSaver}
      onMouseUp={onMouseUpDesktop}
      onMouseDown={onMouseDownDesktop}
      onContextMenu={onContextMenu}
      state={state.powerState}
      tabIndex={0}
    >
      <Icons
        icons={state.icons}
        onMouseDown={onMouseDownIcon}
        onDoubleClick={onDoubleClickIcon}
        displayFocus={state.focusing === FOCUSING.ICON}
        appSettings={appSettings}
        mouse={mouse}
        selecting={state.selecting}
        setSelectedIcons={onIconsSelected}
      />
      <DashedBox startPos={state.selecting} mouse={mouse} />
      <Context.Provider value={{ state, dispatch }}>
        <Windows
          apps={state.apps}
          onMouseDown={onFocusApp}
          onClose={onCloseApp}
          onMinimize={onMinimizeWindow}
          onMaximize={onMaximizeWindow}
          focusedAppId={focusedAppId}
        />
      </Context.Provider>
      <Footer
        apps={state.apps}
        onMouseDownApp={onMouseDownFooterApp}
        focusedAppId={focusedAppId}
        onMouseDown={onMouseDownFooter}
        onClickMenuItem={onClickMenuItem}
      />
      {state.powerState !== POWER_STATE.START && (
        <Modal
          onClose={onModalClose}
          onClickButton={onClickModalButton}
          mode={state.powerState}
        />
      )}
      {state.contextMenuPosition && (
        <ContextMenu
          items={contextMenuData}
          mousePos={state.contextMenuPosition}
          displayFocus={state.focusing === FOCUSING.ICON}
          onClick={onDoubleClickIcon}
        />
      )}
      <BackgroundView background={state.displayProperties.desktop} />
      {isScreenSaverActive && (
        <ScreenSaver
          selectedScreenSaver={state.displayProperties.screenSaver.value}
          activatePreview={state.displayProperties.screenSaverPreview}
        />
      )}
    </Container>
  );
}

const powerOffAnimation = keyframes`
  0% {
    filter: brightness(1) grayscale(0);
  }
  30% {
    filter: brightness(1) grayscale(0);
  }
  100% {
    filter: brightness(0.6) grayscale(1);
  }
`;
const animation = {
  [POWER_STATE.START]: '',
  [POWER_STATE.TURN_OFF]: powerOffAnimation,
  [POWER_STATE.LOG_OFF]: powerOffAnimation,
};

const Container = styled.div`
  @import url('https://fonts.googleapis.com/css?family=Noto+Sans');
  font-family: Tahoma, 'Noto Sans', sans-serif;
  height: 100%;
  overflow: hidden;
  position: relative;
  animation: ${({ state }) => animation[state]} 5s forwards;
  *:not(input):not(textarea) {
    user-select: none;
  }
`;

export default WinXP;
