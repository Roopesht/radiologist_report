import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertIcon, Box, Button, FormControl, FormErrorMessage, FormLabel, HStack, Heading, Input, Select, Spinner, Stack, Text, Textarea } from '@chakra-ui/react';
import { ApiError, createRule, getRule, messageFor, OPTION_KINDS, OptionKind, Rule, updateRule, FieldError } from '../state/rulesClient';
import { useAsync } from '../state/useAsync';
import { draftFromRule, emptyDraft, emptyOption, Errors, OptionDraft, RuleDraft, toInput, validate } from './ruleForm';

const KIND_LABEL: Record<OptionKind, string> = { side: 'Side', calyx: 'Calyx position', size_range: 'Size range', grade: 'Grade', sex: 'Sex' };

// Add or edit one abbreviation rule. Only radiologists and admins can save; the API enforces that.
export function RuleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === undefined;
  const ruleId = isNew ? 0 : Number(id);

  const loaded = useAsync<Rule>(async () => {
    if (isNew) throw new Error('not loading a rule for a new tag');
    try {
      return await getRule(ruleId);
    } catch (e) {
      throw new Error(messageFor(e));
    }
  }, [id]);

  const [draft, setDraft] = useState<RuleDraft | null>(isNew ? emptyDraft() : null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<{ message: string; details: FieldError[] } | null>(null);

  useEffect(() => {
    if (!isNew && loaded.status === 'success' && draft === null) setDraft(draftFromRule(loaded.data));
  }, [loaded, isNew, draft]);

  if (!isNew && loaded.status === 'loading') return <Box p={6}><Spinner aria-label="Loading rule" /></Box>;
  if (!isNew && loaded.status === 'error') return <Box p={6}><Alert status="error" role="alert"><AlertIcon />{loaded.error}</Alert></Box>;
  if (draft === null) return <Box p={6}><Spinner aria-label="Loading rule" /></Box>;

  const set = <K extends keyof RuleDraft>(key: K, value: RuleDraft[K]) => setDraft({ ...draft, [key]: value });
  const setOption = (i: number, patch: Partial<OptionDraft>) =>
    setDraft({ ...draft, options: draft.options.map((o, n) => (n === i ? { ...o, ...patch } : o)) });
  const removeOption = (i: number) => setDraft({ ...draft, options: draft.options.filter((_, n) => n !== i) });
  const addOption = (kind: OptionKind) => setDraft({ ...draft, options: [...draft.options, emptyOption(kind)] });

  const err = (key: string) => errors[key];

  const save = async () => {
    const found = validate(draft, isNew);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      if (isNew) await createRule(toInput(draft));
      else await updateRule(ruleId, toInput(draft));
      navigate('/rules');
    } catch (e) {
      setSaving(false);
      setServerError({ message: messageFor(e), details: e instanceof ApiError ? e.details : [] });
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} maxW="3xl" mx="auto">
      <Heading size="lg" mb={4}>{isNew ? 'Add tag' : `Edit ${draft.code}`}</Heading>

      {serverError && (
        <Alert status="error" role="alert" mb={4} alignItems="flex-start" flexDirection="column">
          <HStack><AlertIcon /><Text>{serverError.message}</Text></HStack>
          {serverError.details.map((d, i) => <Text key={i} fontSize="sm">{d.path}: {d.message}</Text>)}
        </Alert>
      )}

      <Stack spacing={4}>
        <FormControl isRequired isInvalid={!!err('code')} isDisabled={!isNew}>
          <FormLabel>Tag</FormLabel>
          <Input value={draft.code} onChange={(e) => set('code', e.target.value)} placeholder="for example Li" />
          <FormErrorMessage>{err('code')}</FormErrorMessage>
        </FormControl>

        <FormControl isRequired isInvalid={!!err('organ')}>
          <FormLabel>Organ or finding group</FormLabel>
          <Input value={draft.organ} onChange={(e) => set('organ', e.target.value)} />
          <FormErrorMessage>{err('organ')}</FormErrorMessage>
        </FormControl>

        <FormControl>
          <FormLabel>Sex (leave empty for both)</FormLabel>
          <Select value={draft.sexCode} onChange={(e) => set('sexCode', e.target.value)} placeholder="Both sexes">
            <option value="M">Male (M)</option>
            <option value="F">Female (F)</option>
          </Select>
        </FormControl>

        <FormControl isRequired isInvalid={!!err('findingsText')}>
          <FormLabel>Findings text</FormLabel>
          <Textarea rows={4} value={draft.findingsText} onChange={(e) => set('findingsText', e.target.value)} />
          <FormErrorMessage>{err('findingsText')}</FormErrorMessage>
        </FormControl>

        <FormControl>
          <FormLabel>Impression (optional)</FormLabel>
          <Textarea rows={2} value={draft.impressionText} onChange={(e) => set('impressionText', e.target.value)} />
        </FormControl>

        <Box>
          <Heading size="md" mb={2}>Option values</Heading>
          {draft.options.length === 0 && <Text color="gray.600" mb={2}>No option sets for this tag.</Text>}
          <Stack spacing={3}>
            {draft.options.map((o, i) => (
              <Box key={i} borderWidth="1px" borderRadius="md" p={3}>
                <HStack align="flex-start" wrap="wrap">
                  <FormControl maxW="44">
                    <FormLabel fontSize="sm">Kind</FormLabel>
                    <Select size="sm" value={o.kind} onChange={(e) => setOption(i, { kind: e.target.value as OptionKind })}>
                      {OPTION_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                    </Select>
                  </FormControl>
                  {(o.kind === 'side' || o.kind === 'calyx') && (
                    <FormControl isInvalid={!!err(`options.${i}.code`)} maxW="40">
                      <FormLabel fontSize="sm">Value</FormLabel>
                      <Input size="sm" value={o.code} onChange={(e) => setOption(i, { code: e.target.value })} />
                      <FormErrorMessage>{err(`options.${i}.code`)}</FormErrorMessage>
                    </FormControl>
                  )}
                  {o.kind === 'size_range' && (
                    <>
                      <FormControl isInvalid={!!err(`options.${i}.minValue`)} maxW="32">
                        <FormLabel fontSize="sm">From (cm)</FormLabel>
                        <Input size="sm" inputMode="decimal" value={o.minValue} onChange={(e) => setOption(i, { minValue: e.target.value })} />
                        <FormErrorMessage>{err(`options.${i}.minValue`)}</FormErrorMessage>
                      </FormControl>
                      <FormControl isInvalid={!!err(`options.${i}.maxValue`)} maxW="32">
                        <FormLabel fontSize="sm">To (cm)</FormLabel>
                        <Input size="sm" inputMode="decimal" value={o.maxValue} onChange={(e) => setOption(i, { maxValue: e.target.value })} />
                        <FormErrorMessage>{err(`options.${i}.maxValue`)}</FormErrorMessage>
                      </FormControl>
                    </>
                  )}
                  {o.kind === 'grade' && (
                    <FormControl isInvalid={!!err(`options.${i}.findingsText`)} flex="1" minW="48">
                      <FormLabel fontSize="sm">Grade wording</FormLabel>
                      <Input size="sm" value={o.findingsText} onChange={(e) => setOption(i, { findingsText: e.target.value })} />
                      <FormErrorMessage>{err(`options.${i}.findingsText`)}</FormErrorMessage>
                    </FormControl>
                  )}
                  {o.kind === 'sex' && (
                    <FormControl isInvalid={!!err(`options.${i}.sexCode`)} maxW="32">
                      <FormLabel fontSize="sm">Sex</FormLabel>
                      <Select size="sm" value={o.sexCode} onChange={(e) => setOption(i, { sexCode: e.target.value })} placeholder="Choose">
                        <option value="M">Male (M)</option>
                        <option value="F">Female (F)</option>
                      </Select>
                      <FormErrorMessage>{err(`options.${i}.sexCode`)}</FormErrorMessage>
                    </FormControl>
                  )}
                  <Button size="sm" variant="ghost" mt={6} onClick={() => removeOption(i)} aria-label={`Remove option ${i + 1}`}>Remove</Button>
                </HStack>
                {o.kind === 'size_range' && (
                  <FormControl mt={2}>
                    <FormLabel fontSize="sm">Sex for this range (optional)</FormLabel>
                    <Select size="sm" maxW="48" value={o.sexCode} onChange={(e) => setOption(i, { sexCode: e.target.value })} placeholder="Both sexes">
                      <option value="M">Male (M)</option>
                      <option value="F">Female (F)</option>
                    </Select>
                  </FormControl>
                )}
              </Box>
            ))}
          </Stack>
          <HStack mt={3} wrap="wrap">
            {OPTION_KINDS.map((k) => (
              <Button key={k} size="sm" variant="outline" onClick={() => addOption(k)}>Add {KIND_LABEL[k].toLowerCase()}</Button>
            ))}
          </HStack>
        </Box>

        <HStack justify="flex-end" pt={2}>
          <Button variant="ghost" onClick={() => navigate('/rules')} isDisabled={saving}>Cancel</Button>
          <Button colorScheme="brand" onClick={save} isLoading={saving} loadingText="Saving">Save rule</Button>
        </HStack>
      </Stack>
    </Box>
  );
}
