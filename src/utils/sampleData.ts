export interface SampleDataset {
  name: string;
  description: string;
  csv: string;
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    name: 'Standard 4 Courses (STEM & Humanities)',
    description: 'Math 53, CS 61A, Physics 7A, and English R1A with standard passing intervals.',
    csv: `Math 53,MWF 10:00AM-10:50AM,TuTh 9:30AM-10:45AM,MWF 1:00PM-1:50PM
Math 53,Tu 11:00AM-12:00PM,Th 2:00PM-3:00PM,F 9:00AM-9:50AM,W 2:00PM-3:00PM
CS 61A,MWF 1:00PM-1:50PM,MWF 2:00PM-2:50PM,TuTh 2:00PM-3:15PM
CS 61A,Tu 9:30AM-10:45AM,Th 11:00AM-12:15PM,W 10:00AM-11:15AM,F 11:00AM-12:15PM
Physics 7A,TuTh 9:30AM-10:45AM,TuTh 12:30PM-1:45PM,MWF 11:00AM-11:50AM
Physics 7A,M 2:00PM-4:00PM,W 2:00PM-4:00PM,Tu 3:30PM-5:30PM,Th 3:30PM-5:30PM
English R1A,TuTh 11:00AM-12:15PM,TuTh 3:30PM-4:45PM,MWF 9:00AM-9:50AM
English R1A,F 1:00PM-1:50PM,F 2:00PM-2:50PM,M 3:00PM-3:50PM`,
  },
  {
    name: 'Compact 3 Courses (Day Balance Test)',
    description: 'EECS 16A, Data 8, and Stat 134 demonstrating balanced distribution across weekdays.',
    csv: `EECS 16A,TuTh 9:30AM-10:50AM,MWF 10:00AM-10:50AM
EECS 16A,W 1:00PM-1:50PM,F 2:00PM-2:50PM,Tu 1:00PM-1:50PM
Data 8,MWF 11:00AM-11:50AM,TuTh 12:30PM-1:45PM
Data 8,Th 9:30AM-10:45AM,M 2:00PM-3:15PM,F 9:00AM-10:15AM
Stat 134,MWF 1:00PM-1:50PM,TuTh 2:00PM-3:15PM
Stat 134,Tu 11:00AM-11:50AM,Th 11:00AM-11:50AM,W 3:00PM-3:50PM`,
  },
  {
    name: 'Pre-9AM Filter & Constraint Scenario',
    description: 'Includes 8:00 AM and 8:30 AM slots (filtered by Rule 4) alongside valid slots.',
    csv: `Biology 1A,MWF 8:00AM-8:50AM,MWF 10:00AM-10:50AM,TuTh 10:00AM-11:15AM
Biology 1A,Tu 8:30AM-9:20AM,Th 1:00PM-1:50PM,F 9:00AM-9:50AM
Chemistry 1A,MWF 9:00AM-9:50AM,MWF 1:00PM-1:50PM
Chemistry 1A,M 11:00AM-11:50AM,W 11:00AM-11:50AM,Tu 2:00PM-2:50PM`,
  },
];
