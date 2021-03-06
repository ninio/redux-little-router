// @flow
import type {
  StoreCreator,
  StoreEnhancer,
  Reducer,
  State
} from 'redux';

import type { History } from 'history';

import { default as matcherFactory } from './create-matcher';
import attachRouterToReducer from './reducer-enhancer';
import { locationDidChange } from './action-creators';

import matchCache from './match-cache';

import validateRoutes from './util/validate-routes';
import flattenRoutes from './util/flatten-routes';

type StoreEnhancerArgs = {
  routes: Object,
  history: History,
  location: Location,
  createMatcher?: Function,
  passRouterStateToReducer?: bool
};

export default ({
  routes: nestedRoutes,
  history,
  location,
  createMatcher = matcherFactory,
  passRouterStateToReducer = false
}: StoreEnhancerArgs) => {
  validateRoutes(nestedRoutes);
  const routes = flattenRoutes(nestedRoutes);

  return (createStore: StoreCreator) => (
    reducer: Reducer,
    initialState: State,
    enhancer: StoreEnhancer
  ) => {
    const enhancedReducer =
      attachRouterToReducer(passRouterStateToReducer)(reducer);

    const matchRoute = createMatcher(routes);
    const matchWildcardRoute = createMatcher(routes, true);

    const initialStateWithRouter = {
      ...initialState,
      router: {
        ...location,
        ...matchRoute(location.pathname)
      }
    };

    const store = createStore(
      enhancedReducer,
      initialStateWithRouter,
      enhancer
    );

    history.listen(newLocation => {
      /* istanbul ignore else */
      if (newLocation) {
        matchCache.clear();
        store.dispatch(locationDidChange({
          location: newLocation,
          matchRoute
        }));
      }
    });

    return {
      ...store,

      // We attach routes here to allow <RouterProvider>
      // to access unserializable properties of route results.
      routes,

      history,
      matchRoute,
      matchWildcardRoute
    };
  };
};
