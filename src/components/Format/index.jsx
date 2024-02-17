/**
 *  YouTube Downloader
 *  Copyright (C) 2020 - 2024, Adriane Justine Tan
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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Box, Text, Link, Spinner, FormControl, TextInput, Select, Checkbox, Button, Flash } from '@primer/react';
import { AlertIcon } from '@primer/octicons-react';
import axios from 'axios';

import { parseBytes } from '../../utils/bytes';
import { downloadURL } from '../../utils/download';
import { handleChange } from '../../utils/change';

const Format = () => {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [filename, setFilename] = useState('');
  const [videoitag, setVideoitag] = useState('');
  const [audioitag, setAudioitag] = useState('');
  const [audioconvert, setAudioconvert] = useState(false);
  const [includesAudio, setIncludesAudio] = useState(false);
  const [converting, setConverting] = useState(false);

  const location = useLocation();
  const url = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('url');
  }, [location]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();

    if (!url) return;
    const form = event.target;
    const action = form.action;
    const method = form.method;
    setError('');
    setConverting(true);

    try {
      const response = await axios({
        url: action,
        method,
        data: {
          url,
          audioitag,
          videoitag,
          audioconvert
        }
      });

      const data = response.data;
      if (data.success) {
        const fileExt = data.extension;
        downloadURL(`/api/download/${data.id}`, `${filename}.${fileExt}`);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError(error.response.data.message);
    }

    setConverting(false);
  }, [url, audioitag, videoitag, audioconvert, filename]);

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();
    axios.get('/api/info', {
      params: { url },
      signal: controller.signal
    }).then((infoRes) => {
      if (!infoRes.data.success) {
        setError(infoRes.data.message);
        return;
      }

      setInfo(infoRes.data.info);
      setFilename(infoRes.data.info.videoDetails.title);
    }).catch((error) => {
      if (error.code !== 'ERR_CANCELED') setError(error.response.data.message);
    });

    return () => controller.abort();
  }, [url]);

  return (
    <Box display="contents">
      { info !== null && (
        <Box m={5}>
          <Box as="form" action="/api/convert" method="post" onSubmit={handleSubmit} width={[0.8, 0.8, 0.4]} mx="auto" my={5} p={3} sx={{
            backgroundColor: 'canvas.default',
            borderWidth: 1,
            borderColor: 'border.default',
            borderStyle: 'solid',
            borderRadius: 8
          }}>
            <Text fontSize={3}>YouTube Video Info</Text>
            <Box as="iframe" src={info.videoDetails.embed.iframeUrl} width={1} borderWidth={0} my={2} />
            <Text>Video URL: </Text><Link href={info.videoDetails.video_url} muted>{ info.videoDetails.video_url }</Link>

            <FormControl id="filename" required sx={{ mt: 3 }}>
              <FormControl.Label>Filename:</FormControl.Label>
              <TextInput name="filename" value={filename} autoComplete="off" block onChange={handleChange(setFilename)} />
            </FormControl>

            <FormControl id="videoitag" sx={{ mt: 3 }}>
              <FormControl.Label>Available video formats:</FormControl.Label>
              <Select name="videoitag" defaultValue="" block onChange={handleChange(setVideoitag)}>
                <Select.Option value="">Do not include video</Select.Option>
                { info.videoFormats.map((format, i) => {
                  const bytes = parseBytes(format.contentLength);
                  return (
                    <Select.Option value={format.itag} key={i}>
                      { format.mimeType } ({ format.qualityLabel }) - { bytes }
                    </Select.Option>
                  );
                })}
              </Select>
            </FormControl>

            <FormControl id="audioitag" sx={{ mt: 3 }}>
              <FormControl.Label>Available audio formats:</FormControl.Label>
              <Select name="audioitag" defaultValue="" block onChange={(event) => {
                const handler = handleChange(setAudioitag);
                handler(event);
                setIncludesAudio(event.target.value !== '');
              }}>
                <Select.Option value="">Do not include audio</Select.Option>
                { info.audioFormats.map((format, i) => {
                  const bytes = parseBytes(format.contentLength);
                  return (
                    <Select.Option value={format.itag} key={i}>
                      { format.mimeType } ({ format.bitrate } bps) - { bytes }
                    </Select.Option>
                  );
                })}
              </Select>
            </FormControl>

            <FormControl id="audioconvert" disabled={!includesAudio} sx={{ mt: 3 }}>
              <Checkbox name="audioconvert" checked={audioconvert} onChange={handleChange(setAudioconvert)} />
              <FormControl.Label>Convert to MP3</FormControl.Label>
              <FormControl.Caption>Converts the audio format you selected to MP3. The audio filesize indicated may change and conversion will take longer</FormControl.Caption>
            </FormControl>

            { error && <Flash variant="danger" sx={{ my: 2 }}>{ error }</Flash> }

            <Button type="submit" variant="primary" sx={{ display: 'block', width: '100%', mt: 2 }} disabled={converting}>
              <Spinner size="small" sx={{ display: converting ? '' : 'none', mr: 2 }} />
              <Text>Convert and Download</Text>
            </Button>

            <NavLink to="/" style={{ textDecoration: 'none' }}>
              <Button variant="danger" sx={{ display: 'block', width: '100%', mt: 2, textDecoration: 'none' }}>Download another video</Button>
            </NavLink>

            <Text as="p" fontSize={1}>
              Select which format you wanted to download the media then click &quot;Convert and Download&quot;.
              Converting media files may take a while before the download starts so please wait.
            </Text>
          </Box>
        </Box>
      )}

      { info === null && (
        <Box width={[0.8, 0.8, 0.4]} textAlign="center" mx="auto" my={5} p={3} sx={{
          backgroundColor: 'canvas.default',
          borderWidth: 1,
          borderColor: 'border.default',
          borderStyle: 'solid',
          borderRadius: 8
        }}>
          { error &&
            <React.Fragment>
              <Box>
                <AlertIcon size={80} />
              </Box>

              <Box><Text>{ error }</Text></Box>
              <Link href="/">Back to Home</Link>
            </React.Fragment>
          }

          { !error &&
            <React.Fragment>
              <Box>
                <Spinner size="large" />
              </Box>
              <Text>Loading, please wait...</Text>
            </React.Fragment>
          }
        </Box>
      )}
    </Box>
  );
}

export default Format;
