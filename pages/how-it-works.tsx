import { Box, Container, Heading, Stack } from '@chakra-ui/react';
import ChakraUIRenderer from 'chakra-ui-markdown-renderer';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

/* eslint-disable react/no-unescaped-entities */
export default function HowItWorksPage() {
  const [markdown, setMarkdown] = useState('');
  useEffect(() => {
    fetch(`https://raw.githubusercontent.com/Pupmos/cw-native-vesting/main/contracts/cw-native-vesting/README.md`)
      .then((res) => res.text())
      .then((text) => setMarkdown(text));
  }, []);
  return (
    <Stack justifyContent={'center'}>
    <Box maxWidth={'100ch'} mx={4}>
      <ReactMarkdown components={ChakraUIRenderer()} skipHtml >
        {markdown}
      </ReactMarkdown>
    </Box>

    </Stack>
  );
}
