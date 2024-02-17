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

import React from 'react';
import { Box, Text, Heading } from '@primer/react';

const NotFound = () => {
  return (
    <Box width={[1, 0.75, 0.5]} mx="auto" my={10} p={5} sx={{
      backgroundColor: 'canvas.subtle',
      borderWidth: 1,
      borderColor: 'border.default',
      borderStyle: 'solid',
      borderRadius: 8
    }}>
      <Heading>Page Not Found</Heading>
      <Text as="p">The page you&apos;re trying to access is not found on the server.</Text>
    </Box>
  );
}

export default NotFound;
