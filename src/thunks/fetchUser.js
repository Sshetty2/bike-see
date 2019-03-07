import { setCurrentUser, setLoading, setError } from '../actions';
import { fetchFavorites } from '../thunks/fetchFavorites';
import { fetchData } from '../utils/api';

export const fetchUser = (user) => {
  return async (dispatch) => {
    try {
      dispatch(setLoading(true));
      const fetchedUser = await fetchData('https://bike-see.herokuapp.com/api/v1/users', 'POST', user);
      dispatch(setCurrentUser(fetchedUser));
      localStorage.setItem('bike-user', JSON.stringify(fetchedUser));
      dispatch(fetchFavorites(fetchedUser.id));
    } catch (error) {
      dispatch(setError('Error logging in user. Please sign up or try again.'));
    }
    dispatch(setLoading(false));
  }
}