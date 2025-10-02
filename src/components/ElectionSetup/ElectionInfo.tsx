import { Input } from '@heroui/react';
import React from 'react';

interface ElectionInfoProps {
    electionName: string;
    setElectionName: React.Dispatch<React.SetStateAction<string>>;
    errors: {
        electionName?: string;
        nominationStartDate?: string;
        nominationEndDate?: string;
        votingStartDate?: string;
        votingEndDate?: string;
    };
}

export default function ElectionInfo({ electionName, setElectionName, errors }: ElectionInfoProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Input
                    label="Election Name"
                    placeholder="Enter election name"
                    type="text"
                    value={electionName}
                    onChange={(e) => setElectionName(e.target.value)}
                    errorMessage="Election name is required"
                    isInvalid={!!errors.electionName}
                />
            </div>
        </div>
    );
}
