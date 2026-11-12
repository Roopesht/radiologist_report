import React from 'react';
import { Box, FormControl, FormErrorMessage, FormLabel, HStack, Input, Radio, RadioGroup, Stack, Text } from '@chakra-ui/react';
import { FormValues, SEX_CHOICES, formatReportDate, srNoLabel, titleFor } from './reportForm';
import type { ReportHeader } from '../state/reportsClient';

// 'new': nothing saved yet, every field can be typed.
// 'draft': saved draft: the identity fields (name, sex, UHID) are fixed at creation; age, referred by and date can change.
// 'locked': issued or cancelled: nothing can change here.
export type FormMode = 'new' | 'draft' | 'locked';

export interface PatientDetailsFormProps {
  values: FormValues;
  mode: FormMode;
  report: ReportHeader | null;      // null until the report is saved
  errors: Record<string, string>;   // by API field name: name, uhid, sexCode, ageText, referredBy, reportDate
  onChange: (patch: Partial<FormValues>) => void;
}

export function PatientDetailsForm({ values, mode, report, errors, onChange }: PatientDetailsFormProps) {
  const identityLocked = mode !== 'new';
  const detailsLocked = mode === 'locked';
  const title = titleFor(values.sexCode);

  return (
    <Stack spacing={4}>
      <FormControl isRequired isInvalid={!!errors.name} isReadOnly={identityLocked}>
        <FormLabel>Name</FormLabel>
        <Input value={values.name} onChange={(e) => onChange({ name: e.target.value })} />
        <FormErrorMessage>{errors.name}</FormErrorMessage>
      </FormControl>

      <HStack align="flex-start" spacing={6} flexWrap="wrap">
        <FormControl isRequired isInvalid={!!errors.ageText} isReadOnly={detailsLocked} maxW="10rem">
          <FormLabel>Age (years)</FormLabel>
          <Input value={values.age} onChange={(e) => onChange({ age: e.target.value })} inputMode="numeric" />
          <FormErrorMessage>{errors.ageText}</FormErrorMessage>
        </FormControl>

        <FormControl isRequired isInvalid={!!errors.sexCode} isReadOnly={identityLocked}>
          <FormLabel>Sex</FormLabel>
          <RadioGroup value={values.sexCode} onChange={(code) => onChange({ sexCode: code })}>
            <HStack spacing={4}>
              {SEX_CHOICES.map((s) => (
                <Radio key={s.code} value={s.code} isDisabled={identityLocked}>{s.label}</Radio>
              ))}
            </HStack>
          </RadioGroup>
          {title && <Text fontSize="sm" mt={1} aria-live="polite">Title: {title}</Text>}
          <FormErrorMessage>{errors.sexCode}</FormErrorMessage>
        </FormControl>
      </HStack>

      <FormControl isInvalid={!!errors.referredBy} isReadOnly={detailsLocked}>
        <FormLabel>Referred by</FormLabel>
        <Input value={values.referredBy} onChange={(e) => onChange({ referredBy: e.target.value })} />
        <FormErrorMessage>{errors.referredBy}</FormErrorMessage>
      </FormControl>

      <HStack align="flex-start" spacing={6} flexWrap="wrap">
        <FormControl isRequired isInvalid={!!errors.reportDate} isReadOnly={detailsLocked} maxW="14rem">
          <FormLabel>Date</FormLabel>
          <Input type="date" value={values.reportDate} onChange={(e) => onChange({ reportDate: e.target.value })} />
          <Text fontSize="sm" mt={1}>Shown as {formatReportDate(values.reportDate)}</Text>
          <FormErrorMessage>{errors.reportDate}</FormErrorMessage>
        </FormControl>

        <FormControl isRequired isInvalid={!!errors.uhid} isReadOnly={identityLocked} maxW="14rem">
          <FormLabel>UHID NO</FormLabel>
          <Input value={values.uhid} onChange={(e) => onChange({ uhid: e.target.value })} />
          <FormErrorMessage>{errors.uhid}</FormErrorMessage>
        </FormControl>
      </HStack>

      {/* Read-only: a value shown, never an input. A draft shows no number. */}
      <Box>
        <FormLabel mb={1}>Sr. No</FormLabel>
        <Text data-testid="sr-no-value">{report ? srNoLabel(report) : 'Assigned when the report is issued'}</Text>
      </Box>
    </Stack>
  );
}
