import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertIcon, Box, Button, HStack, Heading, Spinner, Stack, Text } from '@chakra-ui/react';
import { ApiError, ReportHeader, createReport, getReport, reportMessageFor, setCurrentSexCode, updateReport } from '../state/reportsClient';
import { useAsync } from '../state/useAsync';
import { FormValues, createBody, emptyForm, formFromReport, patchBody } from './reportForm';
import { FormMode, PatientDetailsForm } from './PatientDetailsForm';

// Enter or change a patient's header. The API validates, stores and numbers; this page only shows and sends.
export function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === undefined;

  const loaded = useAsync<ReportHeader>(async () => {
    if (isNew) throw new Error('no report to load');
    try {
      return await getReport(Number(id));
    } catch (e) {
      throw new Error(reportMessageFor(e));
    }
  }, [id]);

  const [report, setReport] = useState<ReportHeader | null>(null);
  const [values, setValues] = useState<FormValues | null>(isNew ? emptyForm() : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<{ message: string; details: { path: string; message: string }[] } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew && loaded.status === 'success' && report === null) {
      setReport(loaded.data);
      setValues(formFromReport(loaded.data));
    }
  }, [loaded, isNew, report]);

  // The tag engine reads the sex code of the report on screen.
  const sexCode = values?.sexCode ?? '';
  useEffect(() => { setCurrentSexCode(sexCode || null); }, [sexCode]);

  if (!isNew && loaded.status === 'loading') return <Box p={6}><Spinner aria-label="Loading report" /></Box>;
  if (!isNew && loaded.status === 'error') return <Box p={6}><Alert status="error" role="alert"><AlertIcon />{loaded.error}</Alert></Box>;
  if (values === null) return <Box p={6}><Spinner aria-label="Loading report" /></Box>;

  const mode: FormMode = isNew || report === null ? 'new' : report.status === 'draft' ? 'draft' : 'locked';

  const onChange = (patch: Partial<FormValues>) => {
    setValues({ ...values, ...patch });
    // A field the user is changing no longer shows the server's message for it.
    const cleared = { ...errors };
    for (const k of Object.keys(patch)) delete cleared[k];
    setErrors(cleared);
  };

  const save = async () => {
    setServerError(null);
    setErrors({});
    setSaving(true);
    try {
      if (report === null) {
        const created = await createReport(createBody(values));
        setReport(created);
        setValues(formFromReport(created));
        navigate(`/reports/${created.id}`, { replace: true });
      } else {
        const updated = await updateReport(report.id, patchBody(values));
        setReport(updated);
        setValues(formFromReport(updated));
      }
    } catch (e) {
      setServerError({
        message: reportMessageFor(e),
        details: e instanceof ApiError ? e.details : []
      });
      if (e instanceof ApiError) {
        const byField: Record<string, string> = {};
        for (const d of e.details) byField[d.path] = d.message;
        setErrors(byField);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} maxW="3xl" mx="auto">
      <HStack justify="space-between" mb={4} flexWrap="wrap">
        <Heading size="lg">Patient details</Heading>
        {report && <Text fontSize="sm" color="gray.600">Report {report.id} · {report.status}</Text>}
      </HStack>

      {serverError && (
        <Alert status="error" role="alert" mb={4} alignItems="flex-start" flexDirection="column">
          <HStack><AlertIcon /><Text>{serverError.message}</Text></HStack>
          {serverError.details.map((d, i) => <Text key={i} fontSize="sm">{d.path}: {d.message}</Text>)}
        </Alert>
      )}

      {mode === 'locked' && (
        <Alert status="info" mb={4}><AlertIcon />This report is {report?.status}. Its details cannot be changed here.</Alert>
      )}

      <Stack spacing={6}>
        <PatientDetailsForm values={values} mode={mode} report={report} errors={errors} onChange={onChange} />
        {mode !== 'locked' && (
          <HStack>
            <Button colorScheme="blue" onClick={save} isLoading={saving}>
              {report === null ? 'Save patient details' : 'Save changes'}
            </Button>
          </HStack>
        )}
      </Stack>
    </Box>
  );
}
