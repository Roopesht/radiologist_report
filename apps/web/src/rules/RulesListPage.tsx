import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertIcon, Badge, Box, Button, Heading, HStack, Input, Spinner, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import { listRules, messageFor, getToken, setToken, Rule } from '../state/rulesClient';
import { useAsync } from '../state/useAsync';
import { AUTH_ENABLED } from '../state/authFlag';

// Abbreviation rules (REQ-266): every tag, its findings text and impression, with Edit and Add tag.
export function RulesListPage() {
  const navigate = useNavigate();
  const rules = useAsync<Rule[]>(async () => {
    try {
      return await listRules();
    } catch (e) {
      throw new Error(messageFor(e));                       // the page shows the user's message, never the raw code
    }
  }, []);
  const [token, setTokenText] = useState(getToken());

  const saveToken = () => {
    setToken(token);
    rules.reload();
  };

  return (
    <Box p={{ base: 4, md: 6 }} maxW="5xl" mx="auto">
      <HStack justify="space-between" mb={4} wrap="wrap" gap={3}>
        <Heading size="lg">Abbreviation rules</Heading>
        <Button colorScheme="brand" onClick={() => navigate('/rules/new')}>Add tag</Button>
      </HStack>

      {AUTH_ENABLED && (
        <Stack spacing={2} mb={4} direction={{ base: 'column', md: 'row' }} align={{ md: 'end' }}>
          <Box flex="1">
            <Text fontSize="sm" mb={1}>Sign-in token (kept for this browser tab only)</Text>
            <Input
              type="password"
              value={token}
              onChange={(e) => setTokenText(e.target.value)}
              placeholder="Paste your radiologist or admin token"
              aria-label="Sign-in token"
            />
          </Box>
          <Button variant="outline" onClick={saveToken}>Use token</Button>
        </Stack>
      )}

      {rules.status === 'loading' && <Spinner aria-label="Loading rules" />}

      {rules.status === 'error' && <Alert status="error" role="alert"><AlertIcon />{rules.error}</Alert>}

      {rules.status === 'success' && rules.data.length === 0 && (
        <Text color="gray.600">No rules yet. Use Add tag to create the first one.</Text>
      )}

      {rules.status === 'success' && rules.data.length > 0 && (
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th>Tag</Th>
                <Th>Findings text</Th>
                <Th>Impression</Th>
                <Th aria-label="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {rules.data.map((r) => (
                <Tr key={r.id}>
                  <Td><Badge>{r.code}</Badge></Td>
                  <Td maxW="lg" whiteSpace="normal">{r.findingsText}</Td>
                  <Td maxW="sm" whiteSpace="normal">{r.impressionText ?? <Text as="span" color="gray.500">none</Text>}</Td>
                  <Td><Button size="sm" variant="ghost" onClick={() => navigate(`/rules/${r.id}`)} aria-label={`Edit ${r.code}`}>Edit</Button></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
