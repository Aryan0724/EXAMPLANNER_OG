import pandas as pd
df = pd.read_excel('Faculty list-final.xlsx')
# Filter out rows that are header-like or empty
df_clean = df[df['Unnamed: 1'].apply(lambda x: str(x).isdigit())]
print(f"Total faculty in Excel: {len(df_clean)}")
