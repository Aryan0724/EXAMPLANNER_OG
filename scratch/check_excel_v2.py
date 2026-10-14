import pandas as pd
df = pd.read_excel('Faculty list-final.xlsx')
# Based on previous check, names are in a specific column. 
# Let's just print the head and tail to see.
print(df.head(10))
print(df.tail(10))
