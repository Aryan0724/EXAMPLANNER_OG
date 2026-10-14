import re
with open('src/lib/data.ts', 'r', encoding='utf-8') as f:
    content = f.read()
    
# Extract IDs from REAL_FACULTY section
start = content.find('const REAL_FACULTY')
end = content.find('];', start)
faculty_section = content[start:end]
ids = re.findall(r"id: '([^']+)'", faculty_section)

print(f'Total Faculty IDs: {len(ids)}')
print(f'Unique Faculty IDs: {len(set(ids))}')

duplicates = [i for i in set(ids) if ids.count(i) > 1]
if duplicates:
    print(f'Duplicates found: {duplicates}')
else:
    print('No duplicate IDs in faculty list.')
