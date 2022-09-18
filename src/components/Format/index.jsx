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
import { NavLink, useLocation } from 'react-router-dom';
import { Box, Text, Link, Spinner, FormControl, TextInput, Select, Checkbox, Button, Flash } from '@primer/react';
import { AlertIcon } from '@primer/octicons-react';
import axios from 'axios';
import PropTypes from 'prop-types';

import { parseBytes } from '../../utils/bytes';
import { downloadURL } from '../../utils/download';

class Format extends React.Component {
  constructor (props) {
    super(props);

    const params = new URLSearchParams(props.location.search);
    const url = params.get('url');

    this.state = {
      url,
      info: null,
      error: null,
      filename: '',
      videoitag: '',
      audioitag: '',
      audioconvert: false,
      includesAudio: false,
      converting: false
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  async componentDidMount () {
    try {
      const infoRes = await axios.get('/api/info', {
        params: { url: this.state.url }
      });

      if (!infoRes.data.success) {
        this.setState({ error: infoRes.data.message });
        return;
      }

      this.setState({
        info: infoRes.data.info,
        filename: infoRes.data.info.videoDetails.title
      });
    } catch (error) {
      this.setState({ error: error.response.data.message });
    }
  }

  handleChange (event) {
    const input = event.target;
    const state = this.state;
    state[input.name] = input.type === 'checkbox' ? !this.state.audioconvert : input.value;

    state.includesAudio = state.audioitag !== '';
    this.setState(state);
  }

  async handleSubmit (event) {
    event.preventDefault();

    const form = event.target;
    const action = form.action;
    const method = form.method;
    const state = this.state;
    state.error = '';
    state.converting = true;
    this.setState(state);

    try {
      const response = await axios({
        url: action,
        method,
        data: {
          url: state.url,
          audioitag: state.audioitag,
          videoitag: state.videoitag,
          audioconvert: state.audioconvert
        }
      });

      const data = response.data;
      if (data.success) {
        downloadURL(`/api/download/${data.id}`, state.filename);
      } else {
        state.error = data.message;
      }
    } catch (error) {
      state.error = error.response.data.message;
    }

    state.converting = false;
    this.setState(state);
  }

  render () {
    const info = this.state.info;
    let display = null;

    if (info !== null) {
      const details = info.videoDetails;
      const embed = details.embed;
      const videoFormats = [];
      const audioFormats = [];

      for (let i = 0; i < info.videoFormats.length; i++) {
        const format = info.videoFormats[i];
        const bytes = parseBytes(format.contentLength);

        videoFormats.push(
          <Select.Option value={format.itag} key={i}>
            { format.mimeType } ({ format.qualityLabel }) - { bytes }
          </Select.Option>
        );
      }

      for (let i = 0; i < info.audioFormats.length; i++) {
        const format = info.audioFormats[i];
        const bytes = parseBytes(format.contentLength);

        audioFormats.push(
          <Select.Option value={format.itag} key={i}>
            { format.mimeType } ({ format.bitrate } bps) - { bytes }
          </Select.Option>
        );
      }

      display = (
        <Box m={5}>
          <Box as="form" action="/api/convert" method="post" onSubmit={this.handleSubmit} width={[0.8, 0.8, 0.4]} mx="auto" my={5} p={3} sx={{
              backgroundColor: 'canvas.default',
              borderWidth: 1,
              borderColor: 'border.default',
              borderStyle: 'solid',
              borderRadius: 8
            }}>
            <Text fontSize={3}>YouTube Video Info</Text>
            <Box as="iframe" src={embed.iframeUrl} width={1} borderWidth={0} my={2} />
            <Text>Video URL: </Text><Link href={details.video_url} muted>{ details.video_url }</Link>

            <FormControl id="filename" required sx={{ mt: 3 }}>
              <FormControl.Label>Filename:</FormControl.Label>
              <TextInput name="filename" value={this.state.filename} autoComplete="off" block onChange={this.handleChange} />
            </FormControl>

            <FormControl id="videoitag" sx={{ mt: 3 }}>
              <FormControl.Label>Available video formats:</FormControl.Label>
              <Select name="videoitag" defaultValue="" block onChange={this.handleChange}>
                <Select.Option value="">Do not include video</Select.Option>
                { videoFormats }
              </Select>
            </FormControl>

            <FormControl id="audioitag" sx={{ mt: 3 }}>
              <FormControl.Label>Available audio formats:</FormControl.Label>
              <Select name="audioitag" defaultValue="" block onChange={this.handleChange}>
                <Select.Option value="">Do not include audio</Select.Option>
                { audioFormats }
              </Select>
            </FormControl>

            <FormControl id="audioconvert" disabled={!this.state.includesAudio} sx={{ mt: 3 }}>
              <Checkbox name="audioconvert" checked={this.state.audioconvert} onChange={this.handleChange} />
              <FormControl.Label>Convert to MP3</FormControl.Label>
              <FormControl.Caption>Converts the audio format you selected to MP3. The audio filesize indicated may change and conversion will take longer</FormControl.Caption>
            </FormControl>

            { this.state.error && <Flash variant="danger" sx={{ my: 2 }}>{ this.state.error }</Flash> }

            <Button type="submit" variant="primary" sx={{ display: 'block', width: '100%', mt: 2 }} disabled={this.state.converting}>
              <Spinner size="small" sx={{ display: this.state.converting ? '' : 'none', mr: 2 }} />
              <Text>Convert and Download</Text>
            </Button>

            <Button as={NavLink} variant="danger" sx={{ display: 'block', width: '100%', mt: 2 }} to="/">Download another video</Button>

            <Text as="p" fontSize={1}>
              Select which format you wanted to download the media then click &quot;Convert and Download&quot;.
              Converting media files may take a while before the download starts so please wait.
            </Text>
          </Box>
        </Box>
      );
    } else {
      display = (
        <Box width={[0.8, 0.8, 0.4]} textAlign="center" mx="auto" my={5} p={3} sx={{
            backgroundColor: 'canvas.default',
            borderWidth: 1,
            borderColor: 'border.default',
            borderStyle: 'solid',
            borderRadius: 8
          }}>
          { this.state.error &&
            <React.Fragment>
              <Box>
                <AlertIcon size={80} />
              </Box>

              <Box><Text>{ this.state.error }</Text></Box>
              <Link href="/">Back to Home</Link>
            </React.Fragment>
          }

          { !this.state.error &&
            <React.Fragment>
              <Box>
                <Spinner size="large" />
              </Box>
              <Text>Loading, please wait...</Text>
            </React.Fragment>
          }
        </Box>
      );
    }

    return (
      <Box display="contents">
        { display }
      </Box>
    );
  }
}

Format.propTypes = {
  location: PropTypes.any
};

export default function FormatWrapper () {
  const location = useLocation();
  return <Format location={location} />;
}
