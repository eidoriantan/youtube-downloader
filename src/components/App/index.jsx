/**
 *  YouTube Downloader
 *  Copyright (C) 2020 - 2022, Adriane Justine Tan
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
import { Routes, Route, NavLink } from 'react-router-dom';
import { PageLayout, Box, Text, Link, Header, ToggleSwitch, useTheme } from '@primer/react';
import { MarkGithubIcon } from '@primer/octicons-react';
import PropTypes from 'prop-types';

import icon from '../../assets/imgs/icon.png';
import Home from '../Home/';
import Format from '../Format/';
import NotFound from '../NotFound/';

class App extends React.Component {
  constructor (props) {
    super(props);

    this.state = { darkmode: true }
    this.toggleDarkMode = this.toggleDarkMode.bind(this);
  }

  toggleDarkMode () {
    const { setColorMode } = this.props.theme;
    setColorMode(this.state.darkmode ? 'day' : 'night');
    this.setState({ darkmode: !this.state.darkmode });
  }

  render () {
    return (
      <PageLayout containerWidth="full" padding="none" sx={{ backgroundColor: 'canvas.inset', minHeight: '100vh' }}>
        <PageLayout.Header>
          <Header>
            <Header.Item full>
              <Header.Link as={NavLink} to="/">
                <Box display="flex" alignItems="center">
                  <img src={icon} width={32} height={32} alt="YouTube Downloader logo" />
                  <Text as="span" ml={2} fontSize={16}>YouTube Downloader</Text>
                </Box>
              </Header.Link>
            </Header.Item>

            <Header.Item>
              <Box display="flex">
                <Box id="label-theme-switch" flexGrow={1} fontSize={1} fontWeight="bold">Toggle Dark Mode</Box>
              </Box>
              <ToggleSwitch aria-labelledby="label-theme-switch" size="small" checked={this.state.darkmode} onClick={this.toggleDarkMode} />
            </Header.Item>

            <Header.Item>
              <Header.Link href="https://github.com/eidoriantan/youtube-downloader">
                <MarkGithubIcon size="medium" />
              </Header.Link>
            </Header.Item>
          </Header>
        </PageLayout.Header>

        <PageLayout.Content sx={{ backgroundColor: 'canvas.inset' }}>
          <Routes>
            <Route index element={<Home />} />
            <Route path="/format" element={<Format />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageLayout.Content>

        <PageLayout.Footer>
          <Box as="footer" textAlign="center" fontSize={1} mb={3}>
            <Box>Copyright &copy; 2020 - 2022, <Link href="https://eidoriantan.me" muted>@eidoriantan</Link></Box>
            <Box>Site Logo was made by <Link href="https://www.flaticon.com/authors/freepik" muted>FreePik</Link></Box>
          </Box>
        </PageLayout.Footer>
      </PageLayout>
    );
  }
}

App.propTypes = {
  theme: PropTypes.any
};

export default function AppWrapper () {
  const theme = useTheme();
  return <App theme={theme} />;
}
