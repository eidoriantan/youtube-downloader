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
import { useNavigate } from 'react-router-dom';
import { Box, FormControl, Button, Heading, Text, Link, TextInput } from '@primer/react';
import { ChevronRightIcon, InfoIcon } from '@primer/octicons-react';
import PropTypes from 'prop-types';

class Home extends React.Component {
  constructor (props) {
    super(props);

    this.submitVideo = this.submitVideo.bind(this);
  }

  submitVideo (event) {
    event.preventDefault();
    const form = event.target;
    const url = form.querySelector('#url').value;
    const action = new URL(form.action);
    const params = new URLSearchParams();
    params.set('url', url);
    this.props.navigate(`${action.pathname}?${params.toString()}`);
  }

  render () {
    return (
      <React.Fragment>
        <Box width={[0.8, 0.8, 0.6, 0.4]} mx="auto" mb={3} px={[2, 4, 10, 12]} pt={5} pb={8} sx={{
            borderWidth: 0,
            borderBottomWidth: 1,
            borderColor: 'border.default',
            borderStyle: 'solid'
          }}>
          <Box as="form" action="/format" method="get" onSubmit={this.submitVideo} p={3} sx={{
              backgroundColor: 'canvas.default',
              borderWidth: 1,
              borderColor: 'border.default',
              borderStyle: 'solid',
              borderRadius: 8
            }}>
            <Text fontSize={24}>YouTube Video</Text>
            <Box my={3}>
              <FormControl id="url" required>
                <FormControl.Label>YouTube Video ID/Link:</FormControl.Label>
                <TextInput name="url" placeholder="https://www.youtube.com/watch?v=xxx" autoComplete="off" aria-label="url" block />
              </FormControl>
            </Box>

            <Button type="submit" variant="primary" leadingIcon={ChevronRightIcon} sx={{ display: 'block', width: '100%' }}>Submit</Button>

            <Text as="p" fontSize={14}>
              Paste the YouTube video&apos;s link you wish to download then press &quot;Submit&quot;.
            </Text>
          </Box>
        </Box>

        <Box width={[0.8, 0.8, 0.6, 0.4]} mx="auto" mb={3} px={4} py={10} textAlign="center" sx={{
            borderWidth: 0,
            borderBottomWidth: 1,
            borderColor: 'border.default',
            borderStyle: 'solid'
          }}>
          <Box display="flex" alignItems="center" justifyContent="center">
            <InfoIcon size="medium" />
            <Heading sx={{ ml: 2 }}>About</Heading>
          </Box>

          <Text as="p">
            <i>YouTube Downloader</i> is an open-sourced, easy-to-use, mobile-friendly, and ad-free YouTube video converter/downloader.
            It currently supports video (mp4 and webm) and audio (weba, m4a, mp3) formats.
            You can access the site&apos;s codes <Link href="https://github.com/eidoriantan/youtube-downloader">in this repository</Link>.
          </Text>
        </Box>
      </React.Fragment>
    );
  }
}

Home.propTypes = {
  navigate: PropTypes.any
};

export default function HomeWrapper () {
  const navigate = useNavigate();
  return <Home navigate={navigate} />;
}
