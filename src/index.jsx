/**
 *  YouTube Downloader
 *  Copyright (C) 2020 - 2023, Adriane Justine Tan
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BaseStyles, ThemeProvider, theme } from '@primer/react';

import App from './components/App';

const root = ReactDOM.createRoot(document.querySelector('#root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider colorMode="night" dayScheme="light" nightScheme="dark" theme={theme}>
        <BaseStyles>
          <App />
        </BaseStyles>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
