"use client";

/**
 * COHORT — /import: "Import synthetic record".
 *
 * TRUST BOUNDARY (see docs/fhir-trust.md):
 *  - The FHIR bundle NEVER leaves the browser. Every parse happens in memory
 *    via @/lib/fhir-import (zero network I/O — pinned by TESTS/fhir-import).
 *  - "Use demo bundle" performs a same-origin GET of a PUBLIC, hand-written
 *    SYNTHETIC bundle (web/public/fhir-demo/*.json). This is a read of public
 *    demo data, not an upload of anything.
 *  - The "Live test server" tab is opt-in and only fetches PUBLIC Synthea
 *    synthetic data from the open SMART R4 test server; your own record is
 *    never uploaded anywhere. Any failure falls back to the bundled static
 *    bundles (the free server can reset at any time).
 *  - "Request attestation" calls requestAttestation(attributes), the clean
 *    handoff the demo issuer + circuit worker consumes (setAttestationHandler).
 */
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  parseFhirBundle,
  requestAttestation,
  type ExtractedAttributes,
} from "@/lib/fhir-import";

const DEMO_BUNDLES = [
  { id: "patient-diabetic", label: "Demo: adult, type 2 diabetes + hypertension", file: "/fhir-demo/patient-diabetic.json" },
  { id: "patient-cardiac", label: "Demo: older adult, hypertension + CKD", file: "/fhir-demo/patient-cardiac.json" },
  { id: "patient-healthy", label: "Demo: young adult, no conditions", file: "/fhir-demo/patient-healthy.json" },
] as const;

const SMART_R4_DEFAULT = "https://r4.smarthealthit.org";

type Stage = "idle" | "loading" | "parsed" | "error";

export default function ImportPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [attrs, setAttrs] = useState<ExtractedAttributes | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string>("");
  const [attestation, setAttestation] = useState<unknown>(null);
  const [serverBase, setServerBase] = useState(SMART_R4_DEFAULT);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleParsed = useCallback((bundle: unknown, name: string) => {
    try {
      const { attributes, warnings } = parseFhirBundle(bundle);
      setAttrs(attributes);
      setWarnings(warnings);
      setSourceName(name);
      setAttestation(null);
      setError(null);
      setStage("parsed");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setAttrs(null);
      setStage("error");
    }
  }, []);

  const loadDemo = useCallback(
    async (file: string, label: string) => {
      setStage("loading");
      try {
        const res = await fetch(file); // same-origin read of PUBLIC synthetic demo data
        if (!res.ok) throw new Error(`demo bundle fetch failed (${res.status})`);
        handleParsed(await res.json(), label);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStage("error");
      }
    },
    [handleParsed],
  );

  const loadFile = useCallback(
    (file: File) => {
      setStage("loading");
      const reader = new FileReader();
      reader.onload = () => {
        try {
          handleParsed(JSON.parse(String(reader.result)), `Uploaded file: ${file.name}`);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setStage("error");
        }
      };
      reader.onerror = () => {
        setError("could not read the file");
        setStage("error");
      };
      reader.readAsText(file);
    },
    [handleParsed],
  );

  const loadLiveServer = useCallback(async () => {
    setStage("loading");
    setAttestation(null);
    try {
      const base = serverBase.replace(/\/$/, "");
      // Verify the server is alive and R4, then pull one synthetic patient.
      const meta = await fetch(`${base}/metadata`);
      if (!meta.ok) throw new Error(`server metadata unreachable (${meta.status})`);
      const pats = await fetch(`${base}/Patient?_count=1`);
      if (!pats.ok) throw new Error(`Patient search failed (${pats.status})`);
      const patBundle = await pats.json();
      const patient = (patBundle.entry ?? [])[0]?.resource;
      if (!patient?.id) throw new Error("no patients on the server right now");
      const [conds, obss, meds] = await Promise.all([
        fetch(`${base}/Condition?patient=${patient.id}&_count=50`).then((r) => r.json()),
        fetch(`${base}/Observation?patient=${patient.id}&_count=50`).then((r) => r.json()),
        fetch(`${base}/MedicationRequest?patient=${patient.id}&_count=50`).then((r) => r.json()),
      ]);
      // Assemble a local collection Bundle — parsed browser-locally, never sent anywhere.
      const bundle = {
        resourceType: "Bundle",
        type: "collection",
        title: `Live server record — ${patient.id} (public Synthea synthetic data)`,
        entry: [patient, ...conds.entry, ...obss.entry, ...meds.entry]
          .filter(Boolean)
          .map((resource: unknown, i: number) => ({
            fullUrl: `urn:uuid:live-${i}`,
            resource,
          })),
      };
      handleParsed(bundle, `Live test server patient ${patient.id}`);
    } catch (e) {
      setError(
        `Live server unavailable: ${e instanceof Error ? e.message : String(e)}. ` +
          "The free SMART R4 test server can reset — use a bundled static demo instead.",
      );
      setStage("error");
    }
  }, [serverBase, handleParsed]);

  const onRequestAttestation = useCallback(() => {
    if (!attrs) return;
    try {
      setAttestation(requestAttestation(attrs));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("error");
    }
  }, [attrs]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Import synthetic record</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your FHIR bundle is parsed <strong>entirely in your browser</strong> and never
        uploaded. Only the extracted attributes you approve are handed to the
        attestation flow.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="secondary">SYNTHETIC DATA ONLY</Badge>
        <Badge variant="outline">parsed locally</Badge>
        <Badge variant="outline">nothing uploaded</Badge>
      </div>

      <Tabs defaultValue="demo" className="mt-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="demo">Demo bundle</TabsTrigger>
          <TabsTrigger value="file">Upload file</TabsTrigger>
          <TabsTrigger value="live">Live test server</TabsTrigger>
          <TabsTrigger value="launcher">SMART launcher</TabsTrigger>
        </TabsList>

        <TabsContent value="demo">
          <Card>
            <CardHeader>
              <CardTitle>Static curated bundles</CardTitle>
              <CardDescription>
                Hand-written FHIR R4 bundles (Patient.birthDate, SNOMED-CT
                Conditions, LOINC Observations, RxNorm MedicationRequests) —
                deterministic, offline, video-safe.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {DEMO_BUNDLES.map((b) => (
                <Button key={b.id} variant="outline" className="justify-start" onClick={() => loadDemo(b.file, b.label)}>
                  {b.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="file">
          <Card>
            <CardHeader>
              <CardTitle>Upload a bundle</CardTitle>
              <CardDescription>
                Pick a FHIR R4 Bundle JSON file from your device. It is read with
                FileReader and parsed in memory — nothing is sent to any server.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadFile(f);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live">
          <Card>
            <CardHeader>
              <CardTitle>Open SMART R4 test server</CardTitle>
              <CardDescription>
                Optional live source — pre-loaded with public Synthea synthetic
                patients, no auth. If the server is down or reset, the bundled
                static demos above are the fallback.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <Label htmlFor="server-base">FHIR base URL</Label>
                <Input
                  id="server-base"
                  value={serverBase}
                  onChange={(e) => setServerBase(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <Button onClick={loadLiveServer} className="w-fit">
                Load a synthetic patient from the live server
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="launcher">
          <Card>
            <CardHeader>
              <CardTitle>SMART App Launcher (optional)</CardTitle>
              <CardDescription>
                Not the default path — adds ~60–90s. No login or registration;
                any client_id string works on the public launcher.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Open{" "}
                  <a className="underline" href="https://launch.smarthealthit.org" target="_blank" rel="noreferrer">
                    launch.smarthealthit.org
                  </a>
                  .
                </li>
                <li>
                  Choose the R4 FHIR server, pick any synthetic patient in the
                  simulated provider login, and launch the app.
                </li>
                <li>
                  From the launched app, export or copy the patient&apos;s FHIR
                  Bundle, then use the <strong>Upload file</strong> tab here —
                  parsing stays browser-local either way.
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {stage === "loading" && <p className="mt-6 text-sm text-muted-foreground">Parsing…</p>}

      {stage === "error" && error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>Could not import</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {stage === "parsed" && attrs && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Eligibility checklist — extracted attributes</CardTitle>
              <Badge variant={attrs.sourceLabel === "SYNTHETIC" ? "secondary" : "destructive"}>
                {attrs.sourceLabel}
              </Badge>
            </div>
            <CardDescription>{sourceName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Age</div>
                <div className="text-xl font-semibold">
                  {attrs.age !== undefined ? `${attrs.age} y` : "unknown"}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Conditions</div>
                <div className="text-xl font-semibold">{attrs.hasCondition ? "Yes" : "None found"}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Medications</div>
                <div className="text-xl font-semibold">{attrs.onMedication ? "Yes" : "None found"}</div>
              </div>
            </div>

            {attrs.conditions.length > 0 && (
              <div>
                <div className="mb-1 font-medium">Diagnoses (SNOMED-CT, active only)</div>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {attrs.conditions.map((c) => (
                    <li key={c.code}>
                      {c.display} <span className="text-xs">({c.code})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {attrs.labs.length > 0 && (
              <div>
                <div className="mb-1 font-medium">Labs (LOINC)</div>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {attrs.labs.map((l) => (
                    <li key={l.code}>
                      {l.display}: {l.value} {l.unit ?? ""}
                      <span className="text-xs"> ({l.code})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {attrs.medications.length > 0 && (
              <div>
                <div className="mb-1 font-medium">Medications (RxNorm, active)</div>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {attrs.medications.map((m) => (
                    <li key={m.code}>
                      {m.display} <span className="text-xs">({m.code})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {warnings.length > 0 && (
              <Alert>
                <AlertTitle>Parser notes</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Separator />
            <div>
              <Button onClick={onRequestAttestation}>Request attestation</Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Hands the extracted attributes (age {attrs.age}, condition{" "}
                {String(attrs.hasCondition)}, medication {String(attrs.onMedication)})
                to the attestation flow via <code>requestAttestation()</code>. The
                demo issuer + circuit wiring is plugged in by a separate worker;
                until then the request is held locally and nothing is transmitted.
              </p>
            </div>

            {attestation !== null && (
              <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">
                {JSON.stringify(attestation, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
