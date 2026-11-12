import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react';

// Dashboard: the menu to the screens that exist (abbreviation rules, reports).
// Each entry is a route in router.tsx; add a new entry here when a screen is added.
const menu = [
  { label: 'Abbreviation rules', description: 'View and edit the tag wording and options (REQ-266).', to: '/rules' },
  { label: 'Add abbreviation rule', description: 'Create a new tag rule.', to: '/rules/new' },
  { label: 'New report', description: 'Enter patient details and start a report (REQ-267).', to: '/reports/new' },
  { label: 'Expand normal-organ tags', description: 'Type tags such as Li, P, S and get the findings in report order (WI-027, REQ-268).', to: '/rules/expand' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  return (
    <Stack spacing={6} p={6} maxW="960px" mx="auto">
      <Heading as="h1" size="lg">Radiologist report</Heading>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        {menu.map((item) => (
          <Box key={item.to} borderWidth="1px" borderRadius="md" p={4}>
            <Heading as="h2" size="sm" mb={2}>{item.label}</Heading>
            <Text fontSize="sm" mb={4}>{item.description}</Text>
            <Button size="sm" colorScheme="blue" onClick={() => navigate(item.to)}>Open</Button>
          </Box>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
