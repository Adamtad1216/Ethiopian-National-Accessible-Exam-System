import React, { useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { bulkImportStudentsApi } from "@/services/api";

type ImportPreview = {
  fileName: string;
  validRows: number;
  errorCount: number;
  errors: string[];
};

const REQUIRED_COLUMNS = [
  "nationalid",
  "firstname",
  "lastname",
  "email",
  "password",
  "school",
  "grade",
  "region",
];

export default function AdminBulkImport() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <Navigate to="/login" />;

  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const downloadTemplate = () => {
    const headers = "nationalId,firstName,lastName,email,password,school,grade,region\n";
    const sampleRow = "ETH-1001,Kebede,Alemu,kebede@school.et,kebePass123,Bole High School,12,Addis Ababa\n";
    const blob = new Blob([headers + sampleRow], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student_import_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV template downloaded successfully!");
  };

  const parseCsvData = (text: string): any[] => {
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (rows.length <= 1) return [];

    const headers = rows[0].split(",").map((h) => h.trim().toLowerCase());
    
    const nationalIdIndex = headers.indexOf("nationalid");
    const firstNameIndex = headers.indexOf("firstname");
    const lastNameIndex = headers.indexOf("lastname");
    const emailIndex = headers.indexOf("email");
    const passwordIndex = headers.indexOf("password");
    const schoolIndex = headers.indexOf("school");
    const gradeIndex = headers.indexOf("grade");
    const regionIndex = headers.indexOf("region");

    const students: any[] = [];
    const dataRows = rows.slice(1);

    for (const row of dataRows) {
      const columns = row.split(",").map((c) => c.trim());
      if (columns.length < headers.length) continue;

      students.push({
        nationalId: columns[nationalIdIndex] || "",
        firstName: columns[firstNameIndex] || "",
        lastName: columns[lastNameIndex] || "",
        email: columns[emailIndex] || "",
        password: columns[passwordIndex] || "",
        school: columns[schoolIndex] || "",
        grade: columns[gradeIndex] || "",
        region: columns[regionIndex] || "",
      });
    }

    return students;
  };

  const parseCsvPreview = (text: string, fileName: string): ImportPreview => {
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (rows.length === 0) {
      return {
        fileName,
        validRows: 0,
        errorCount: 1,
        errors: ["The file is empty."],
      };
    }

    const headers = rows[0].split(",").map((h) => h.trim().toLowerCase());

    const missing = REQUIRED_COLUMNS.filter(
      (column) => !headers.includes(column),
    );
    const errors: string[] = [];

    if (missing.length > 0) {
      errors.push(`Missing required columns: ${missing.join(", ")}`);
    }

    const dataRows = rows.slice(1);
    if (dataRows.length === 0) {
      errors.push("No student rows found.");
    }

    return {
      fileName,
      validRows: missing.length > 0 ? 0 : dataRows.length,
      errorCount: errors.length,
      errors,
    };
  };

  const readFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isCsv = lowerName.endsWith(".csv");
    const isXlsx = lowerName.endsWith(".xlsx");

    if (!isCsv && !isXlsx) {
      setPreview(null);
      setParsedStudents([]);
      toast.error("Unsupported file type. Please upload a CSV or XLSX file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPreview(null);
      setParsedStudents([]);
      toast.error("File is too large. Maximum allowed size is 10MB.");
      return;
    }

    if (isXlsx) {
      setPreview({
        fileName: file.name,
        validRows: 0,
        errorCount: 1,
        errors: [
          "XLSX preview is not available yet. Please use CSV for validation preview.",
        ],
      });
      setParsedStudents([]);
      return;
    }

    const text = await file.text();
    setPreview(parseCsvPreview(text, file.name));
    setParsedStudents(parseCsvData(text));
  };

  const handleFileSelect = async (file?: File) => {
    if (!file) return;
    try {
      await readFile(file);
    } catch (error) {
      console.error("Failed to read import file", error);
      setPreview(null);
      setParsedStudents([]);
      toast.error("Failed to read this file. Try another file.");
    }
  };

  const confirmImport = async () => {
    if (!preview || preview.errorCount > 0 || preview.validRows === 0) {
      toast.error("Resolve file issues before confirming import.");
      return;
    }

    setIsImporting(true);
    try {
      const res = await bulkImportStudentsApi(parsedStudents);
      toast.success(
        `Successfully imported ${res.importedCount} student accounts!`,
      );
      setPreview(null);
      setParsedStudents([]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (error: any) {
      console.error("Failed to import students", error);
      toast.error(
        error?.message || "Failed to import students. Please check your data."
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Bulk Student Import</h1>
        <p className="text-sm text-muted-foreground">
          Import students from CSV or Excel files
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-display">Upload File</CardTitle>
            <CardDescription>Supported formats: CSV, XLSX</CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".csv,.xlsx"
              title="Choose student import file"
              aria-label="Choose student import file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                void handleFileSelect(file);
              }}
            />
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                void handleFileSelect(file);
              }}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload student file"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Drop file here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">
                Max 10MB • CSV or XLSX
              </p>
            </div>

            {preview && (
              <div className="mt-4 p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-2">
                  {preview.errorCount === 0 ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  )}
                  <p className="font-medium text-success">
                    Import Preview Ready
                  </p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  File: {preview.fileName}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {preview.validRows} students found, {preview.errorCount}{" "}
                  validation errors
                </p>
                {preview.errors.length > 0 && (
                  <ul className="mt-2 text-xs text-warning space-y-1 list-disc pl-4">
                    {preview.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                )}
                <Button
                  size="sm"
                  className="mt-3 bg-success hover:bg-success/90 text-success-foreground"
                  disabled={
                    preview.errorCount > 0 ||
                    preview.validRows === 0 ||
                    isImporting
                  }
                  onClick={() => void confirmImport()}
                >
                  {isImporting ? "Importing..." : "Confirm Import"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-display">File Format & Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-4 font-mono text-xs space-y-1">
              <p className="text-muted-foreground">Required columns:</p>
              <p>
                nationalId, firstName, lastName, email, password, school, grade, region
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">Example:</h4>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs min-w-[600px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">nationalId</th>
                      <th className="p-2 text-left">firstName</th>
                      <th className="p-2 text-left">lastName</th>
                      <th className="p-2 text-left">email</th>
                      <th className="p-2 text-left">password</th>
                      <th className="p-2 text-left">school</th>
                      <th className="p-2 text-left">grade</th>
                      <th className="p-2 text-left">region</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-2">ETH-2001</td>
                      <td className="p-2">Kebede</td>
                      <td className="p-2">Alemu</td>
                      <td className="p-2">kebede@school.et</td>
                      <td className="p-2">kebePass123</td>
                      <td className="p-2">Bole High</td>
                      <td className="p-2">12</td>
                      <td className="p-2">Addis Ababa</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 font-semibold"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Download Student Import Template (CSV)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
