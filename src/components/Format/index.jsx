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

import { audioTag } from '../../utils/tag';
import { parseBytes } from '../../utils/bytes';
import { downloadURL } from '../../utils/download';
import { handleChange, handleFileChange, inputTime } from '../../utils/change';
import { msToTime, timeToS } from '../../utils/time';
import FileInput from '../FileInput';

const Format = () => {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [filename, setFilename] = useState('');
  const [videoitag, setVideoitag] = useState('');
  const [audioitag, setAudioitag] = useState('');
  const [audioconvert, setAudioconvert] = useState(false);
  const [includesAudio, setIncludesAudio] = useState(false);
  const [converting, setConverting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addTag, setAddTag] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [range, setRange] = useState(false);
  const [rangeStart, setRangeStart] = useState('00:00:00');
  const [rangeEnd, setRangeEnd] = useState('00:00:00');

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
      const reqData = {
        url,
        audioitag,
        videoitag,
        audioconvert
      };

      if (range) {
        const startSeconds = timeToS(rangeStart);
        const endSeconds = timeToS(rangeEnd);

        if (startSeconds > endSeconds) {
          throw new Error('End time must be greater than start time');
        }

        reqData.rangeStart = rangeStart;
        reqData.rangeDuration = endSeconds - startSeconds;
      }

      const response = await axios({
        url: action,
        method,
        data: reqData
      });

      const data = response.data;
      if (data.success) {
        const fileExt = data.extension;
        let downloadLink = `/api/download/${data.id}`;

        if (addTag) {
          setAdding(true);
          downloadLink = await audioTag(downloadLink, {
            artwork: file,
            title,
            artist,
            album
          });
          setAdding(false);
        }

        downloadURL(downloadLink, `${filename}.${fileExt}`);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError(error.response.data.message);
    }

    setConverting(false);
  }, [
    url, audioitag, videoitag, audioconvert, filename,
    addTag, file, title, artist, album,
    range, rangeStart, rangeEnd
  ]);

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

  useEffect(() => {
    if (!info) return;

    let audioApproxMs = 0;
    let videoApproxMs = 0;
    let approxMs = 0;

    if (audioitag) {
      const format = info.audioFormats.filter((format) => format.itag.toString() === audioitag)[0];
      audioApproxMs = parseInt(format.approxDurationMs);
    }

    if (videoitag) {
      const format = info.videoFormats.filter((format) => format.itag.toString() === videoitag)[0];
      videoApproxMs = parseInt(format.approxDurationMs);
    }

    approxMs = videoApproxMs > audioApproxMs ? videoApproxMs : audioApproxMs;
    setRangeStart('00:00:00');
    setRangeEnd(msToTime(approxMs));
  }, [info, videoitag, audioitag]);

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

            <FormControl id="range" sx={{ mt: 3 }}>
              <Checkbox name="range" checked={range} onChange={handleChange(setRange)} />
              <FormControl.Label>Add start and end times</FormControl.Label>
              <FormControl.Caption>Specify start and end times of the video to download</FormControl.Caption>
            </FormControl>

            { range && (
              <Box sx={{ display: 'flex', mt: 2 }}>
                <FormControl id="range-start" required sx={{ mr: 3 }}>
                  <FormControl.Label>Start:</FormControl.Label>
                  <TextInput name="range-start" value={rangeStart} autoComplete="off" block onBlur={inputTime(setRangeStart)} onChange={handleChange(setRangeStart)} />
                </FormControl>

                <FormControl id="range-end" required>
                  <FormControl.Label>End:</FormControl.Label>
                  <TextInput name="range-end" value={rangeEnd} autoComplete="off" block onBlur={inputTime(setRangeEnd)} onChange={handleChange(setRangeEnd)} />
                </FormControl>
              </Box>
            )}

            <FormControl id="audioconvert" disabled={!includesAudio} sx={{ mt: 3 }}>
              <Checkbox name="audioconvert" checked={audioconvert} onChange={handleChange(setAudioconvert)} />
              <FormControl.Label>Convert to MP3</FormControl.Label>
              <FormControl.Caption>Converts the audio format you selected to MP3. The audio filesize indicated may change and conversion will take longer</FormControl.Caption>
            </FormControl>

            <FormControl id="audiotag" disabled={!includesAudio || !audioconvert} sx={{ mt: 3 }}>
              <Checkbox name="audiotag" checked={addTag} onChange={handleChange(setAddTag)} />
              <FormControl.Label>Add audio metadata tags</FormControl.Label>
              <FormControl.Caption>Adds MP3 metadata tags to audio such as artwork, title, artist, album, etc</FormControl.Caption>
            </FormControl>

            { includesAudio && audioconvert && addTag && (
              <>
                <FormControl id="audiotag-artwork" sx={{ mt: 3 }}>
                  <FormControl.Label>Artwork Image:</FormControl.Label>
                  <FileInput name="audiotag-artwork" accept="image/*" onChange={handleFileChange(setFile)} />
                </FormControl>

                <FormControl id="audiotag-title" sx={{ mt: 3 }}>
                  <FormControl.Label>Title:</FormControl.Label>
                  <TextInput name="audiotag-title" value={title} autoComplete="off" block onChange={handleChange(setTitle)} />
                </FormControl>

                <FormControl id="audiotag-artist" sx={{ mt: 3 }}>
                  <FormControl.Label>Artist:</FormControl.Label>
                  <TextInput name="audiotag-artist" value={artist} autoComplete="off" block onChange={handleChange(setArtist)} />
                </FormControl>

                <FormControl id="audiotag-album" sx={{ mt: 3 }}>
                  <FormControl.Label>Album:</FormControl.Label>
                  <TextInput name="audiotag-album" value={album} autoComplete="off" block onChange={handleChange(setAlbum)} />
                </FormControl>
              </>
            )}

            { error && <Flash variant="danger" sx={{ my: 2 }}>{ error }</Flash> }

            <Button type="submit" variant="primary" sx={{ display: 'block', width: '100%', mt: 3 }} disabled={converting}>
              <Spinner size="small" sx={{ display: converting ? '' : 'none', mr: 2 }} />
              <Text>{ adding ? 'Adding tags...' : 'Convert and Download' }</Text>
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
