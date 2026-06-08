import re

with open('D:/vnstocks/web_ptich_ck/FE/app/hub/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('            {/* Main Preview Panel / AI Prompt Generator */}')
end_idx = content.find('      {/* ==========================================', start_idx)

head_block = content[start_idx:end_idx]
cp_start = head_block.find('              {showChartPreview ? (')
cp_end = head_block.find('              ) : (') + len('              ) : (')
chart_preview_code = head_block[cp_start:cp_end]

rej_content = open('D:/vnstocks/web_ptich_ck/FE/app/hub/page.tsx.rej', 'r', encoding='utf-8').read()
plus_lines = []
for line in rej_content.splitlines():
    if line.startswith('+') and not line.startswith('+++'):
        plus_lines.append(line[1:])
    elif line.startswith(' ') and not line.startswith(' +'):
        plus_lines.append(line[1:])

hunk_11 = '\n'.join(plus_lines)
header_start = hunk_11.find('                  {/* Header */}')
ai_agent_code = hunk_11[header_start:]

prompt_preview_end = ai_agent_code.find('                        </div>\n\n                      ) : (')

button_code = """
                      {/* Generate Button */}
                      <button
                        type="button"
                        id="ai-gen-code-btn"
                        onClick={handleAiGenCode}
                        disabled={aiAgentLoading || !datasetPreview || (isFirstAiGen && !aiChartDesc.trim())}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-orange-600 hover:from-violet-700 hover:to-orange-700 disabled:opacity-40 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-violet-600/20 cursor-pointer"
                      >
                        {aiAgentLoading ? (
                          <>
                            <span className="inline-flex gap-1">
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                            Đang tạo code...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            {isFirstAiGen ? 'Tạo Code với AI' : 'Cập nhật Code'}
                          </>
                        )}
                      </button>
"""

ai_agent_code = ai_agent_code[:prompt_preview_end] + button_code + ai_agent_code[prompt_preview_end:]

final_block = "            {/* Main Preview Panel / AI Prompt Generator */}\n"
final_block += '            <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col shadow-lg h-[600px]">\n'
final_block += chart_preview_code + '\n' + ai_agent_code

final_block += """
                </>
              )}
            </div>
          </div>
        </div>
      )}
"""

new_content = content[:start_idx] + final_block + content[end_idx:]
new_content = new_content.replace('const [isFirstAiGen, setIsFirstAiGen] = useState(false);', 'const [isFirstAiGen, setIsFirstAiGen] = useState(true);')

with open('D:/vnstocks/web_ptich_ck/FE/app/hub/page_fixed.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Success')