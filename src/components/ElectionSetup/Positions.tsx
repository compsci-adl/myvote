import { Button, Checkbox, Input } from '@heroui/react';
import { useRef, useState } from 'react';

interface Position {
    name: string;
    vacancies: number;
    description: string;
    executive: boolean;
}

interface PositionsProps {
    addPosition: () => void;
    positions: Position[];
    updatePosition: (index: number, updatedPosition: Position) => void;
    removePosition: (index: number) => void;
    errors?: Record<
        number,
        {
            name?: string;
            description?: string;
            vacancies?: string;
            executive?: string;
        }
    >;
    onCsvImport?: (positions: Position[]) => void;
}

// Robust CSV row parsing: handles quoted fields with commas
function parseCsvRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

export default function Positions({
    addPosition,
    positions,
    updatePosition,
    removePosition,
    errors = {},
    onCsvImport,
}: PositionsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [csvError, setCsvError] = useState<string | null>(null);

    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCsvError(null);
        const file = e.target.files?.[0];
        if (!file) {
            setCsvError('No file selected.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split(/\r?\n/).filter(Boolean);
                if (lines.length < 2) {
                    setCsvError('CSV must have a header and at least one row.');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    return;
                }
                const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
                const nameIdx = header.indexOf('name');
                const vacanciesIdx = header.indexOf('vacancies');
                const descriptionIdx = header.indexOf('description');
                const executiveIdx = header.indexOf('executive');
                if (nameIdx === -1) {
                    setCsvError('CSV must have a "name" column.');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    return;
                }
                const imported: Position[] = lines.slice(1).map((line) => {
                    const cols = parseCsvRow(line);
                    let executiveVal = false;
                    if (executiveIdx !== -1 && cols[executiveIdx] !== undefined) {
                        const val = cols[executiveIdx].trim().toLowerCase();
                        if (val === 'yes') {
                            executiveVal = true;
                        } else if (val === 'no') {
                            executiveVal = false;
                        } else {
                            executiveVal = false;
                        }
                    }
                    return {
                        name: cols[nameIdx]?.trim() || '',
                        vacancies: parseInt(cols[vacanciesIdx] || '1', 10) || 1,
                        description: cols[descriptionIdx]?.trim() || '',
                        executive: executiveVal,
                    };
                });
                if (imported.length === 0) {
                    setCsvError('No positions found in CSV.');
                } else if (onCsvImport) {
                    onCsvImport(imported);
                }
            } catch {
                setCsvError('Failed to parse CSV. Please check the file format.');
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Positions</h2>
                <div className="flex gap-2">
                    <Button color="primary" onPress={addPosition}>
                        <span className="mr-0.5 text-2xl">+</span> Add Position
                    </Button>
                    <Button color="secondary" onPress={() => fileInputRef.current?.click()}>
                        Import CSV
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        style={{ display: 'none' }}
                        onChange={handleCsvUpload}
                    />
                </div>
            </div>
            {csvError && <div className="mb-2 text-red-500 text-sm">{csvError}</div>}
            <div className="flex flex-col gap-6">
                {positions.map((position, index) => {
                    const positionErrors = errors[index] || {};
                    return (
                        <div key={index} className="flex flex-col gap-4 rounded-xl bg-gray-200 p-4">
                            <Input
                                label="Position Name"
                                placeholder="Enter position name"
                                type="text"
                                value={position.name}
                                onChange={(e) =>
                                    updatePosition(index, { ...position, name: e.target.value })
                                }
                                errorMessage={positionErrors.name}
                                isInvalid={!!positionErrors.name}
                            />
                            <Input
                                label="Description"
                                placeholder="Enter position description"
                                type="text"
                                value={position.description}
                                onChange={(e) =>
                                    updatePosition(index, {
                                        ...position,
                                        description: e.target.value,
                                    })
                                }
                                errorMessage={positionErrors.description}
                                isInvalid={!!positionErrors.description}
                            />
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
                                <Input
                                    label="Vacancies"
                                    placeholder="Enter number of vacancies"
                                    type="number"
                                    value={position.vacancies.toString()}
                                    min={1}
                                    onChange={(e) =>
                                        updatePosition(index, {
                                            ...position,
                                            vacancies: parseInt(e.target.value),
                                        })
                                    }
                                    className="w-full md:w-3/5"
                                    errorMessage={positionErrors.vacancies}
                                    isInvalid={!!positionErrors.vacancies}
                                />
                                <div className="flex w-full items-center gap-4 md:w-2/5">
                                    <Checkbox
                                        checked={position.executive}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            updatePosition(index, {
                                                ...position,
                                                executive: e.target.checked,
                                            })
                                        }
                                    >
                                        Executive
                                    </Checkbox>
                                    <Button
                                        color="secondary"
                                        onPress={() => removePosition(index)}
                                        className="w-full"
                                        isDisabled={positions.length === 1}
                                    >
                                        <span className="mr-0.5 text-2xl">-</span> Remove Position
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
