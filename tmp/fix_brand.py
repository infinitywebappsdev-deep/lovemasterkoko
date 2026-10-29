with open('src/app/admin/media/page.tsx', 'r') as f:
    lines = f.readlines()

# Find the line with 'Official Brand Logos & Identity Assets' and insert after the h2 closing tag
# The file has & (HTML entity) so we need to match that
new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    if 'Official Brand Logos & Identity Assets' in line or 'Official Brand Logos & Identity Assets' in line:
        # Insert the refresh button div after this line (which is the h2 text)
        insert_code = '''                <div className="flex items-center gap-2">\n                  <button\n                    type="button"\n                    onClick={() => setRefreshKey(Date.now())}\n                    className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-mono hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"\n                    title="Refresh brand assets from image folder"\n                  >\n                    <Loader2 className="h-3.5 w-3.5" />\n                    <span>Refresh</span>\n                  </button>\n                </div>'''
        new_lines.append(insert_code)

with open('src/app/admin/media/page.tsx', 'w') as f:
    f.writelines(new_lines)
print('Done - inserted refresh button after brand logos heading')