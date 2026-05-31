import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthState {
  user: UserState | null;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: true, // Initially true while checking auth state
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserState | null>) => {
      state.user = action.payload;
      state.isLoading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setUser, setLoading } = authSlice.actions;

export default authSlice.reducer;
