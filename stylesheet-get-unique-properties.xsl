<?xml version="1.0"?>

<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0">
	<xsl:key name="commandUnique" match="command" use="@name"/>
	<xsl:key name="todUnique" match="tod" use="concat(@fu_address,@zaddress,@zone,@oaddress,@classifier,@size,@ToD_address)"/>
	<xsl:variable name="tod" select="document('../../../../../xml/tod/E2015_AKOTest_ToD_DE_V34.xml')"/>
	<xsl:template match="/">
		<root>
			<xsl:call-template name="get-unique-commands"/>
			<xsl:apply-templates/>
		</root>
		<!-- -->
	</xsl:template>
	<!-- -->
	<xsl:template name="get-unique-commands">
		<xsl:for-each select="//command[generate-id() = generate-id(key('commandUnique', @name)[1])]">
			<xsl:element name="{@name}"/>
		</xsl:for-each>
	</xsl:template>
	<!-- -->
	<xsl:template match="tod">
		<xsl:element name="{name(.)}">
			<xsl:variable name="fu_address" select="@fu_address"/>
			<xsl:variable name="zone" select="@zone"/>
			<xsl:variable name="zaddress" select="@zaddress"/>
			<xsl:variable name="oaddress" select="@oaddress"/>
			<xsl:variable name="size" select="@size"/>
			<xsl:variable name="classifier" select="@classifier"/>
			<xsl:variable name="ToD_address" select="@ToD_address"/>
			<xsl:if test="generate-id() = generate-id(key('todUnique', concat(@fu_address,@zaddress,@zone,@oaddress,@classifier,@size,@ToD_address))[1])">
				<xsl:variable name="node" select="$tod//unit[@fu_address=$fu_address and @zone=$zone and @zaddress=$zaddress and @oaddress=$oaddress]/object[@size=$size and @classifier=$classifier and @ToD_address=$ToD_address]"/>
				<xsl:copy-of select="$node"/>		
			</xsl:if>
			
			<!--<xsl:if test="$node">
				<xsl:element name="unit">
					<xsl:copy-of select="$node/parent::unit/@*"/>
					<xsl:copy-of select="$node"/>
				</xsl:element>
			</xsl:if>-->
		</xsl:element>
	</xsl:template>
	<!-- -->
	<xsl:template match="text()"/>
<!-- <xsl:variable name="node" select="$tod//unit[@fu_address=$Fu-address and @zone=$Zone and @zaddress=$Zone-address and @oaddress=$Object-address]/object[@size=$Size and @classifier=$Classifier and @ToD_address=$Tod-address]"/> -->
	<!-- -->
</xsl:stylesheet>