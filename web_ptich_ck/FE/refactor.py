import os
import re

file_path = os.path.join("app", "hub", "page.tsx")
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add import
content = content.replace(
    'import { api } from "@/lib/api-client";',
    'import { api } from "@/lib/api-client";\nimport AIPromptGenerator from "@/components/charts/AIPromptGenerator";'
)

# 2. Remove states
state_to_remove = """  // AI Prompt Generator state
  const [aiPromptChartDesc, setAiPromptChartDesc] = useState("");
  const [aiPromptFieldDesc, setAiPromptFieldDesc] = useState("");
  const [aiPromptDesignNote, setAiPromptDesignNote] = useState("");
  const [aiPromptCopied, setAiPromptCopied] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [aiGeneratingProgress, setAiGeneratingProgress] = useState(0);
  const [aiFollowUpPrompt, setAiFollowUpPrompt] = useState("");"""

content = content.replace(state_to_remove, """  // AI Prompt Generator state
  // Refactored to hook""")

# 3. Replace UI
start_marker = "              ) : (\n                // AI PROMPT GENERATOR MODE (RESTORED)"
end_marker = "                  </div>\n                </>\n              )}"

s = content.find(start_marker)
if s != -1:
    e = content.find(end_marker, s)
    if e != -1:
        new_ui = """              ) : (
                <AIPromptGenerator
                  datasetPreview={datasetPreview}
                  currentCode={echartsCode}
                  onCodeGenerated={(newCode) => {
                    setEchartsCode(newCode);
                    setChartConfigTab("code");
                  }}
                />
              )}"""
        content = content[:s] + new_ui + content[e + len(end_marker):]
        print("Replaced UI successfully")
    else:
        print("End marker not found")
else:
    print("Start marker not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
