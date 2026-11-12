import React, { useState } from 'react';
import { Alert, AlertIcon, Badge, Box, Button, Heading, HStack, Stack, Text, Textarea } from '@chakra-ui/react';
import { ExpansionResult, expandTags, messageFor } from '../state/rulesClient';

// Tag entry for normal-organ tags (WI-027, REQ-268): one tag per line or several in a sequence. Shows the findings in
// report order and lists every tag that could not be expanded.
export function TagEntryPanel() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExpansionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const expand = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await expandTags(text));
    } catch (e) {
      setResult(null);
      setError(messageFor(e));                              // the user's message, never the raw code
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} maxW="3xl" mx="auto">
      <Heading size="lg" mb={4}>Expand normal-organ tags</Heading>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Type tags, one per line or in a sequence, e.g. Li P S'}
        aria-label="Normal-organ tags"
        rows={5}
        mb={3}
      />
      <Button colorScheme="brand" onClick={expand} isLoading={busy} isDisabled={text.trim() === ''}>Expand</Button>

      {error && <Alert status="error" role="alert" mt={4}><AlertIcon />{error}</Alert>}

      {result && (
        <Stack spacing={4} mt={6}>
          {result.findings.length > 0 && (
            <Box>
              <Text fontWeight="semibold" mb={2}>Findings</Text>
              <Stack as="ol" spacing={2} pl={0} style={{ listStyle: 'none' }}>
                {result.findings.map((f) => (
                  <HStack key={f.tag + f.reportPosition} align="start" as="li">
                    <Badge mt={1}>{f.tag}</Badge>
                    <Text>{f.findingsText}</Text>
                  </HStack>
                ))}
              </Stack>
            </Box>
          )}

          {result.unknown.length > 0 && (
            <Alert status="warning" role="alert" alignItems="start">
              <AlertIcon />
              <Box>
                <Text fontWeight="semibold">Not expanded</Text>
                {result.unknown.map((u, i) => (
                  <Text key={`${u.token}-${i}`}>
                    {u.token}: {u.reason === 'no-rule' ? 'no rule in the abbreviation rules yet' : 'not a normal-organ tag'}
                  </Text>
                ))}
              </Box>
            </Alert>
          )}
        </Stack>
      )}
    </Box>
  );
}
