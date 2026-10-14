import pandas as pd
df = pd.read_excel('Faculty list-final.xlsx')
# It seems column 2 (index 2) or something has the names.
# Let's print column names and some data.
print(df.columns)
print(df.iloc[5:15, 0:5])
